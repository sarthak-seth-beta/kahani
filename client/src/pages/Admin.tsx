import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Plus,
  Calendar as CalendarIcon,
  Check,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronRight,
  Sheet,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DailyFreeTrial {
  date: string;
  count: number;
  fullDate: string;
}

interface DailyWhatsAppMessage {
  date: string;
  outgoing: number;
  incoming: number;
  fullDate: string;
}

interface TrafficSource {
  source: string;
  count: number;
  created_at: string | null;
  updated_at: string | null;
}

export default function Admin() {
  const [, setLocation] = useLocation();

  // Collapsible state: all collapsed on load; API runs only when a section is open
  const [openDashboard, setOpenDashboard] = useState(false);
  const [openTrials, setOpenTrials] = useState(false);
  const [openTrafficSources, setOpenTrafficSources] = useState(false);
  const [openWhatsapp, setOpenWhatsapp] = useState(false);

  const {
    data: allFreeTrialData,
    isLoading: isLoadingTrials,
    error: freeTrialError,
  } = useQuery<DailyFreeTrial[]>({
    queryKey: ["/api/admin/daily-free-trials"],
    retry: 1,
    enabled: openTrials,
  });

  const {
    data: allWhatsappData,
    isLoading: isLoadingWhatsapp,
    error: whatsappError,
  } = useQuery<DailyWhatsAppMessage[]>({
    queryKey: ["/api/admin/daily-whatsapp-messages"],
    retry: 1,
    enabled: openWhatsapp,
  });

  const { data: trafficSourcesData, isLoading: isLoadingTrafficSources } =
    useQuery<TrafficSource[]>({
      queryKey: ["/api/admin/traffic-sources"],
      retry: 1,
      enabled: openTrafficSources,
    });

  // Temporary date ranges for selection (not applied yet)
  const [tempFreeTrialDateRange, setTempFreeTrialDateRange] = useState<
    DateRange | undefined
  >(undefined);
  const [tempWhatsappDateRange, setTempWhatsappDateRange] = useState<
    DateRange | undefined
  >(undefined);

  // Applied date ranges (what's actually used to filter)
  const [appliedFreeTrialDateRange, setAppliedFreeTrialDateRange] = useState<
    DateRange | undefined
  >(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: start, to: end };
  });
  const [appliedWhatsappDateRange, setAppliedWhatsappDateRange] = useState<
    DateRange | undefined
  >(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: start, to: end };
  });

  // Popover open states
  const [freeTrialPopoverOpen, setFreeTrialPopoverOpen] = useState(false);
  const [whatsappPopoverOpen, setWhatsappPopoverOpen] = useState(false);

  // Filter data client-side based on applied date ranges
  const filterDataByDateRange = <T extends { fullDate: string }>(
    data: T[] | undefined,
    dateRange: DateRange | undefined,
  ): T[] => {
    if (!data || !dateRange?.from || !dateRange?.to) {
      return data || [];
    }

    const startDate = startOfDay(dateRange.from);
    const endDate = startOfDay(dateRange.to);

    return data.filter((item) => {
      const itemDate = startOfDay(parseISO(item.fullDate));
      return (
        (isAfter(itemDate, startDate) ||
          itemDate.getTime() === startDate.getTime()) &&
        (isBefore(itemDate, endDate) ||
          itemDate.getTime() === endDate.getTime())
      );
    });
  };

  const freeTrialData = useMemo(
    () => filterDataByDateRange(allFreeTrialData, appliedFreeTrialDateRange),
    [allFreeTrialData, appliedFreeTrialDateRange],
  );

  const whatsappData = useMemo(
    () => filterDataByDateRange(allWhatsappData, appliedWhatsappDateRange),
    [allWhatsappData, appliedWhatsappDateRange],
  );

  // Apply date range handlers
  const handleApplyFreeTrialDateRange = () => {
    if (tempFreeTrialDateRange?.from && tempFreeTrialDateRange?.to) {
      setAppliedFreeTrialDateRange(tempFreeTrialDateRange);
      setFreeTrialPopoverOpen(false);
    }
  };

  const handleApplyWhatsappDateRange = () => {
    if (tempWhatsappDateRange?.from && tempWhatsappDateRange?.to) {
      setAppliedWhatsappDateRange(tempWhatsappDateRange);
      setWhatsappPopoverOpen(false);
    }
  };

  // Reset date range handlers
  const handleResetFreeTrialDateRange = () => {
    setTempFreeTrialDateRange(undefined);
    setAppliedFreeTrialDateRange(undefined);
    setFreeTrialPopoverOpen(false);
  };

  const handleResetWhatsappDateRange = () => {
    setTempWhatsappDateRange(undefined);
    setAppliedWhatsappDateRange(undefined);
    setWhatsappPopoverOpen(false);
  };

  // Log errors for debugging
  if (freeTrialError) {
    console.error("Free trial data error:", freeTrialError);
  }
  if (whatsappError) {
    console.error("WhatsApp data error:", whatsappError);
  }

  const totalTrials =
    freeTrialData?.reduce((sum, item) => sum + item.count, 0) || 0;
  const maxTrialCount = Math.max(
    ...(freeTrialData?.map((item) => item.count) || [0]),
    1,
  );

  const totalOutgoing =
    whatsappData?.reduce((sum, item) => sum + item.outgoing, 0) || 0;
  const totalIncoming =
    whatsappData?.reduce((sum, item) => sum + item.incoming, 0) || 0;
  const maxWhatsappCount = Math.max(
    ...(whatsappData?.flatMap((item) => [item.outgoing, item.incoming]) || [0]),
    1,
  );

  return (
    <div className="min-h-screen bg-[#FDF4DC] px-3 pt-3 pb-0">
      <div className="w-full mx-auto">
        <Collapsible open={openDashboard} onOpenChange={setOpenDashboard}>
          <Card className="mb-4">
            <CollapsibleTrigger asChild>
              <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {openDashboard ? (
                      <ChevronDown className="h-5 w-5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0" />
                    )}
                    <div className="text-left">
                      <CardTitle className="text-xl font-bold">
                        Admin Dashboard
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Analytics Dashboard
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-base font-semibold text-gray-700">
                    Total Free Trials:{" "}
                    <span className="text-black text-lg">
                      {allFreeTrialData != null ? totalTrials : "—"}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      id="admin-export-trials-csv"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = "/api/admin/export-free-trials";
                      }}
                      variant="outline"
                      className="text-xs"
                      size="sm"
                    >
                      <Download size={14} />
                      Export Trials CSV
                    </Button>
                    <Button
                      id="enzo-xyz-albums"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation("/enzo-xyz/albums");
                      }}
                      className="text-xs"
                      size="sm"
                    >
                      <Plus size={14} />
                      Manage Albums
                    </Button>
                    <Button
                      id="admin-sync-google-sheet"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          "https://docs.google.com/spreadsheets/d/1AulN6PEgDAZMwZRht5Z1ChNzmgjweMmNl4UN13dNsYE/edit",
                          "_blank",
                        );
                      }}
                      variant="outline"
                      className="text-xs"
                      size="sm"
                    >
                      <Sheet size={14} />
                      Open Order Sheet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={openTrials} onOpenChange={setOpenTrials}>
          <Card className="mb-4">
            <CollapsibleTrigger asChild>
              <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  {openTrials ? (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">
                      Daily Free Trial Registrations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Number of free trials registered per day
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pt-0 flex items-center justify-end flex-wrap gap-2">
                <Popover
                  open={freeTrialPopoverOpen}
                  onOpenChange={setFreeTrialPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal text-xs",
                        !appliedFreeTrialDateRange && "text-muted-foreground",
                      )}
                      size="sm"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appliedFreeTrialDateRange?.from ? (
                        appliedFreeTrialDateRange.to ? (
                          <>
                            {format(
                              appliedFreeTrialDateRange.from,
                              "LLL dd, y",
                            )}{" "}
                            -{" "}
                            {format(appliedFreeTrialDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(appliedFreeTrialDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    <div className="p-3">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={
                          tempFreeTrialDateRange?.from ||
                          appliedFreeTrialDateRange?.from
                        }
                        selected={
                          tempFreeTrialDateRange || appliedFreeTrialDateRange
                        }
                        onSelect={(range) => {
                          setTempFreeTrialDateRange(range);
                        }}
                        numberOfMonths={2}
                      />
                      <div className="flex justify-between gap-2 mt-3 pt-3 border-t">
                        <Button
                          id="admin-reset-free-trial-date-range"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetFreeTrialDateRange}
                          className="text-xs"
                        >
                          <RotateCcw className="mr-2 h-3 w-3" />
                          Reset
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            id="admin-set-temp-free-trial-date-range"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTempFreeTrialDateRange(undefined);
                              setFreeTrialPopoverOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            id="admin-apply-free-trial-date-range"
                            size="sm"
                            onClick={handleApplyFreeTrialDateRange}
                            disabled={
                              !tempFreeTrialDateRange?.from ||
                              !tempFreeTrialDateRange?.to
                            }
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <CardContent className="p-3 pb-0">
                {isLoadingTrials ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : freeTrialError ? (
                  <div className="flex items-center justify-center h-64 text-red-600 text-sm">
                    {freeTrialError instanceof Error
                      ? freeTrialError.message
                      : "Failed to load"}
                  </div>
                ) : freeTrialData && freeTrialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={freeTrialData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 50,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        tick={{ fill: "#374151", fontSize: 10 }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: "#374151", fontSize: 10 }}
                        domain={[0, maxTrialCount + 1]}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #E5E7EB",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "12px",
                        }}
                        labelStyle={{
                          color: "#374151",
                          fontWeight: "bold",
                          fontSize: "11px",
                        }}
                        formatter={(value: number) => [value, "Free Trials"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#A8DADC"
                        radius={[4, 4, 0, 0]}
                        name="Free Trials"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                    <p>No data available for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible
          open={openTrafficSources}
          onOpenChange={setOpenTrafficSources}
        >
          <Card className="mb-4">
            <CollapsibleTrigger asChild>
              <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  {openTrafficSources ? (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">Traffic Sources</CardTitle>
                    <CardDescription className="text-xs">
                      Source and visit count
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-4 pt-0">
                {isLoadingTrafficSources ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : trafficSourcesData && trafficSourcesData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead>Created at</TableHead>
                        <TableHead>Last scanned at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trafficSourcesData.map((row) => {
                        const formatIst = (raw: string | null | undefined) => {
                          if (raw == null) return "—";
                          const d = new Date(raw);
                          if (Number.isNaN(d.getTime())) return "—";
                          try {
                            return d.toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZoneName: "short",
                            });
                          } catch {
                            try {
                              return (
                                d.toLocaleString("en-IN", {
                                  timeZone: "Asia/Kolkata",
                                }) + " IST"
                              );
                            } catch {
                              return d.toISOString();
                            }
                          }
                        };
                        const updatedRaw =
                          row.updated_at ??
                          (row as { updatedAt?: string }).updatedAt;
                        return (
                          <TableRow key={row.source}>
                            <TableCell className="font-medium">
                              {row.source}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.count}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatIst(
                                row.created_at ??
                                  (row as { createdAt?: string }).createdAt,
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatIst(updatedRaw)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No traffic source data yet.
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={openWhatsapp} onOpenChange={setOpenWhatsapp}>
          <Card className="mb-0">
            <CollapsibleTrigger asChild>
              <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  {openWhatsapp ? (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">
                      Daily WhatsApp Messages
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Outgoing and incoming messages per day
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pt-0 flex items-center justify-end flex-wrap gap-2">
                <Popover
                  open={whatsappPopoverOpen}
                  onOpenChange={setWhatsappPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal text-xs",
                        !appliedWhatsappDateRange && "text-muted-foreground",
                      )}
                      size="sm"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appliedWhatsappDateRange?.from ? (
                        appliedWhatsappDateRange.to ? (
                          <>
                            {format(appliedWhatsappDateRange.from, "LLL dd, y")}{" "}
                            - {format(appliedWhatsappDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(appliedWhatsappDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    <div className="p-3">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={
                          tempWhatsappDateRange?.from ||
                          appliedWhatsappDateRange?.from
                        }
                        selected={
                          tempWhatsappDateRange || appliedWhatsappDateRange
                        }
                        onSelect={(range) => {
                          setTempWhatsappDateRange(range);
                        }}
                        numberOfMonths={2}
                      />
                      <div className="flex justify-between gap-2 mt-3 pt-3 border-t">
                        <Button
                          id="admin-reset-whatsapp-date-range"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetWhatsappDateRange}
                          className="text-xs"
                        >
                          <RotateCcw className="mr-2 h-3 w-3" />
                          Reset
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            id="admin-set-temp-whatsapp-date-range"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTempWhatsappDateRange(undefined);
                              setWhatsappPopoverOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            id="admin-apply-whatsapp-date-range"
                            size="sm"
                            onClick={handleApplyWhatsappDateRange}
                            disabled={
                              !tempWhatsappDateRange?.from ||
                              !tempWhatsappDateRange?.to
                            }
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <CardContent className="p-3 pb-0">
                {isLoadingWhatsapp ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : whatsappError ? (
                  <div className="flex items-center justify-center h-64 text-red-600 text-sm">
                    {whatsappError instanceof Error
                      ? whatsappError.message
                      : "Failed to load"}
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#3B82F6]"></div>
                          <span>Outgoing: {totalOutgoing}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#10B981]"></div>
                          <span>Incoming: {totalIncoming}</span>
                        </div>
                      </div>
                    </div>
                    {whatsappData && whatsappData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={whatsappData}
                          margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 50,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                          />
                          <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={50}
                            tick={{ fill: "#374151", fontSize: 10 }}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fill: "#374151", fontSize: 10 }}
                            domain={[0, maxWhatsappCount + 1]}
                            width={30}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #E5E7EB",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                            }}
                            labelStyle={{
                              color: "#374151",
                              fontWeight: "bold",
                              fontSize: "11px",
                            }}
                          />
                          <Bar
                            dataKey="outgoing"
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                            name="Outgoing Messages"
                          />
                          <Bar
                            dataKey="incoming"
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                            name="Incoming Messages"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                        <p>No data available for the selected period.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
