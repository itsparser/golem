import {ComponentsSection} from "@/pages/dashboard/componentSection.tsx";
import {APISection} from "@/pages/dashboard/apiSection.tsx";


export const Dashboard = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 min-h-[60vh] max-h-[60vh] mb-8">
                <APISection/>
                <ComponentsSection/>
            </div>
        </div>
    );
};