import { ArrowRight, Layers, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { useEffect, useState } from 'react';
import { API } from '@/service';
import { ComponentList } from '@/types/component.ts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import ErrorBoundary from '@/components/errorBoundary';
import { ComponentCard } from '../components';

export const ComponentsSection = () => {
  const navigate = useNavigate();
  const [components, setComponents] = useState<{
    [key: string]: ComponentList;
  }>({});
  useEffect(() => {
    API.getComponentByIdAsKey().then(response => setComponents(response));
  }, []);

  return (
    <ErrorBoundary>
      <Card className={'rounded-lg lg:col-span-2'}>
        <CardHeader>
          <div className="flex justify-between items-center mb-6">
            <CardTitle>Components</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/components')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-scroll max-h-[70vh]">
            {Object.keys(components).length > 0 ? (
              <div className="p-4 pt-0 md:p-6 md:pt-0 flex-1 w-full">
                <div className="grid w-full grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                  {Object.values(components).map((data: ComponentList) => (
                    <ComponentCard
                      key={data.componentId}
                      data={data}
                      onCardClick={() =>
                        navigate(`/components/${data.componentId}`)
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
                <Layers className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Components</h3>
                <p className="text-gray-500 mb-4">
                  Create your first component to get started
                </p>
                <Button
                  onClick={() => {
                    navigate('/components/create');
                  }}
                >
                  <PlusCircle className="mr-2 size-4" />
                  Create Component
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};
