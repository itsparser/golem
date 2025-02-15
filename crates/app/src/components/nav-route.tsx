import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge.tsx';
import { useNavigate } from 'react-router-dom';

export const HTTP_METHOD_COLOR = {
  Get: 'bg-emerald-900 text-emerald-200 hover:bg-emerald-900',
  Post: 'bg-gray-900 text-gray-200 hover:bg-gray-900',
  Put: 'bg-yellow-900 text-yellow-200 hover:bg-yellow-900',
  Patch: 'bg-blue-900 text-blue-200 hover:bg-blue-900',
  Delete: 'bg-red-900 text-red-200 hover:bg-red-900',
  Head: 'bg-purple-900 text-purple-200 hover:bg-purple-900',
  Options: 'bg-indigo-900 text-indigo-200 hover:bg-indigo-900',
  Trace: 'bg-pink-900 text-pink-200 hover:bg-pink-900',
  Connect: 'bg-sky-900 text-sky-200 hover:bg-sky-900',
};

export function NavRoutes({
  routes,
  setActiveItem,
  activeItem,
}: {
  routes: {
    method: string;
    name: string;
    url: string;
  }[];
  setActiveItem: (item: string) => void;
  activeItem: string;
}) {
  const navigate = useNavigate();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Routes</SidebarGroupLabel>
      <SidebarMenu>
        {routes.map(item => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              onClick={() => {
                setActiveItem(item.name);
              }}
              isActive={item.name === activeItem}
              asChild
            >
              <div
                className="cursor-pointer"
                onClick={() => navigate(item.url)}
              >
                <Badge
                  variant="secondary"
                  className={
                    HTTP_METHOD_COLOR[
                      item.method as keyof typeof HTTP_METHOD_COLOR
                    ]
                  }
                >
                  {item.method}
                </Badge>
                <span>{item.name}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
