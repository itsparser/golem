import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Layers, PlusCircle, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Api } from '@/types/api.ts';
import { API } from '@/service';
import ErrorBoundary from '@/components/errorBoundary';
import { Badge } from '@/components/ui/badge.tsx';
import { removeDuplicateApis } from '@/lib/utils';

export function APISection() {
  const navigate = useNavigate();
  const [apis, setApis] = useState([] as Api[]);

  useEffect(() => {
    API.getApiList().then(response => {
      const newData = removeDuplicateApis(response);
      setApis(newData);
    });
  }, []);

  return (
    <ErrorBoundary>
      <Card className="transition-all hover:shadow-md  flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          {/* <div className="flex justify-between items-center mb-6"> */}
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-muted-foreground" />
              APIs
            </CardTitle>
            <Button variant="ghost" onClick={() => navigate('/apis')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          {/* </div> */}
        </CardHeader>
        <CardContent className="space-y-2">
          {apis && apis.length > 0 ? apis.map(api => (
                <div key={api.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {navigate(`/apis/${api.id}/version/${api.version}`);}}>
                  <p className="text-sm font-medium">{api.id}</p>
                  <Badge variant="secondary">{api.version}</Badge>
                </div>
              )
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border p-12 text-center grid place-items-center h-full w-full">
              <Layers className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No APIs</h3>
              <p className="text-gray-500 mb-4">
                Create your first API to get started
              </p>
              <Button onClick={() => navigate('/apis/create')}>
                <PlusCircle className="mr-2 size-4" />
                Create API
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}
