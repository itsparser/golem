import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ApiLeftNav from "@/pages/api/details/apiLeftNav";
import { API } from "@/service";
import { Api } from "@/types/api";
import { useEffect, useMemo, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

export const ApiLayout = () => {
  const { apiName, version } = useParams();
  const navigate = useNavigate();
  const [apiDetails, setApiDetails] = useState([] as Api[]);
  const [queryParams] = useSearchParams();
  const path = queryParams.get("path");
  const method = queryParams.get("method");

  const basePath = useLocation().pathname.replace(
    `/apis/${apiName}/version/${version}`,
    ""
  );
  console.log(useLocation().pathname);
  console.log(basePath);
  console.log("path ", path);
  console.log("method ", method);

  const sortedVersions = useMemo(() => {
    return [...apiDetails].sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    );
  }, [apiDetails]);

  useEffect(() => {
    API.getApi(apiName!).then(async (response) => {
      setApiDetails(response);
    });
  }, [apiName, version]);

  return (
    <div className="flex bg-background text-foreground">
      <ApiLeftNav />
      <div className="flex-1 flex flex-col">
        <header className="w-full border-b bg-background py-4">
          <div className="mx-auto px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-foreground truncate">
                {apiName}
              </h1>
              <div className="flex items-center gap-2">
                <Select
                  defaultValue={version}
                  onValueChange={(version) => {
                    const selectedApi = apiDetails.find(
                      (api) => api.version === version
                    );
                    if (selectedApi) {
                      navigate(
                        `/apis/${apiName}/version/${version}${basePath}`
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sortedVersions.map((api) => (
                      <SelectItem value={api.version} key={api.version}>
                        {api.version} {api.draft ? "(Draft)" : "(Published)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
};
