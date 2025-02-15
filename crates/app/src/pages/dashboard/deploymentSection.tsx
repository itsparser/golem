import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Layers, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API } from '@/service';
import ErrorBoundary from '@/components/errorBoundary';
import { removeDuplicateApis } from '@/lib/utils';
import { Deployment } from '@/types/deployments';

export function DeploymentSection() {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState([] as Deployment[]);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const response = await API.getApiList();
        const newData = removeDuplicateApis(response);
        const deploymentPromises = newData.map(api =>
          API.getDeploymentApi(api.id),
        );
        const allDeployments = await Promise.all(deploymentPromises);
        const combinedDeployments = allDeployments.flat().filter(Boolean);
        setDeployments(combinedDeployments);
      } catch (error) {
        console.error('Error fetching deployments:', error);
      }
    };

    fetchDeployments();
  }, []);

  return (
    <ErrorBoundary>
      <Card className="transition-all hover:shadow-md max-h-[275px]">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle  className="text-xl font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              Deployments
            </CardTitle>
            <Button variant="ghost"className="text-sm font-medium" size="sm" onClick={() => navigate('/deployments')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
        </CardHeader>
        <CardContent>
          {deployments.length > 0 ? (
              deployments.map((deployment, index) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                  navigate(`/deployments`);
                }}>
                  <p className="text-sm font-medium">{deployment.site.host}</p>
                </div>
              ))
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border p-4 text-center grid place-items-center h-full w-full">
              <Layers className="h-5 w-5 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium mb-1">No Deployments</h3>
              <Button onClick={() => navigate('/deployments/create')}>
                <PlusCircle className="mr-2 size-4" />
                Create Deployment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}
