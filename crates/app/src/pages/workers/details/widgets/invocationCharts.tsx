import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Invocation } from "@/types/worker";

interface ProcessedData {
  date: string;
  [key: string]: string | number;
}

const processData = (data: Invocation[]): ProcessedData[] => {
  const groupedData: Record<string, ProcessedData> = {};
  const functionSet = new Set<string>();

  // Group data by date and collect unique function names
  data.forEach(curr => {
    const date = new Date(curr.timestamp);
    const dateKey = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const functionName = curr.function.match(/{(.*)}/)?.[1];

    if (!functionName) return;

    functionSet.add(functionName);

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { date: dateKey };
    }

    groupedData[dateKey][functionName] =
      ((groupedData[dateKey][functionName] ?? 0) as number) + 1;
  });

  // Normalize data: Ensure all functions exist on all dates with 0 if missing
  return Object.values(groupedData).map(entry => {
    functionSet.forEach(func => {
      if (!(func in entry)) {
        entry[func] = 0; // Fill missing function data with 0
      }
    });
    return entry;
  });
};

export function InvocationsChart({ data = [] as Invocation[] }) {
  const chartData = processData(data);

  const functionList =
    chartData.length > 0
      ? Object.keys(chartData[0]).filter(key => key !== "date")
      : [];

  return (
    <ChartContainer config={{}} className="h-[400px]">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-muted-foreground" />
        <YAxis className="text-muted-foreground" />
        <ChartTooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Date
                      </span>
                      <span className="font-bold">
                        {payload[0].payload.date}
                      </span>
                    </div>
                    {payload.map(entry => (
                      <div key={entry.name} className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {entry.name}
                        </span>
                        <span className="font-bold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        {functionList.map((functionName, index) => (
          <Bar
            key={functionName}
            dataKey={functionName}
            fill={`hsl(${index * 50}, 70%, 50%)`} // Different colors
            stackId="a"
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
