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
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, Calendar as CalendarIcon, Check, RotateCcw } from "lucide-react";
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

export default function Admin() {
  const [, setLocation] = useLocation();

  // Fetch all data once on page load (no date filtering in API call)
  const {
    data: allFreeTrialData,
    isLoading: isLoadingTrials,
    error: freeTrialError,
  } = useQuery<DailyFreeTrial[]>({
    queryKey: ["/api/admin/daily-free-trials"],
    retry: 1,
  });

  const {
    data: allWhatsappData,
    isLoading: isLoadingWhatsapp,
    error: whatsappError,
  } = useQuery<DailyWhatsAppMessage[]>({
    queryKey: ["/api/admin/daily-whatsapp-messages"],
    retry: 1,
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

  const isLoading = isLoadingTrials || isLoadingWhatsapp;
  const hasError = freeTrialError || whatsappError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDF4DC] p-4">
        <div className="w-full mx-auto">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#FDF4DC] p-4">
        <div className="w-full mx-auto">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Error</CardTitle>
              <CardDescription className="text-sm">
                Failed to load data. Please try again later.
                <br />
                <span className="text-xs text-red-600 mt-2 block">
                  {freeTrialError instanceof Error
                    ? freeTrialError.message
                    : String(freeTrialError || "")}
                  {whatsappError instanceof Error
                    ? whatsappError.message
                    : String(whatsappError || "")}
                </span>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
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
        <Card className="mb-4">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-xl font-bold">
                  Admin Dashboard
                </CardTitle>
                <CardDescription className="text-xs">
                  Analytics Dashboard
                </CardDescription>
              </div>
              <Button
                onClick={() => setLocation("/enzo-xyz/albums")}
                className="text-xs"
                size="sm"
              >
                <Plus size={14} />
                Manage Albums
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div>
              <p className="text-base font-semibold text-gray-700">
                Total Free Trials:{" "}
                <span className="text-black text-lg">{totalTrials}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">
                  Daily Free Trial Registrations
                </CardTitle>
                <CardDescription className="text-xs">
                  Number of free trials registered per day
                </CardDescription>
              </div>
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
                          {format(appliedFreeTrialDateRange.from, "LLL dd, y")}{" "}
                          - {format(appliedFreeTrialDateRange.to, "LLL dd, y")}
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
          </CardHeader>
          <CardContent className="p-3 pb-0">
            {freeTrialData && freeTrialData.length > 0 ? (
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
        </Card>

        <Card className="mb-0">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">
                  Daily WhatsApp Messages
                </CardTitle>
                <CardDescription className="text-xs">
                  Outgoing and incoming messages per day
                </CardDescription>
              </div>
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
                          {format(appliedWhatsappDateRange.from, "LLL dd, y")} -{" "}
                          {format(appliedWhatsappDateRange.to, "LLL dd, y")}
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
          </CardHeader>
          <CardContent className="p-3 pb-0">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
