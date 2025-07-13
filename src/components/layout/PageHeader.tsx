
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
    icon?: React.ReactNode;
  };
  showBack?: boolean;
  onBack?: () => void;
  gradient?: string;
}

export const PageHeader = ({
  title,
  description,
  action,
  showBack = false,
  onBack,
  gradient = "from-orange-500 to-yellow-500"
}: PageHeaderProps) => {
  return (
    <div className={`bg-gradient-to-r ${gradient} text-white p-6 rounded-xl shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            {description && (
              <p className="text-orange-100 mt-2">{description}</p>
            )}
          </div>
        </div>
        
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "secondary"}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};
