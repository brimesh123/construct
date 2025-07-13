
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const StatusBadge = ({ status, variant, className }: StatusBadgeProps) => {
  const getStatusVariant = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    
    if (['active', 'completed', 'approved', 'present'].includes(lowercaseStatus)) {
      return 'default';
    }
    if (['inactive', 'cancelled', 'rejected', 'absent'].includes(lowercaseStatus)) {
      return 'destructive';
    }
    if (['pending', 'on hold', 'review'].includes(lowercaseStatus)) {
      return 'secondary';
    }
    return 'outline';
  };

  const getStatusColor = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    
    if (['active', 'completed', 'approved', 'present'].includes(lowercaseStatus)) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (['inactive', 'cancelled', 'rejected', 'absent'].includes(lowercaseStatus)) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (['pending', 'on hold', 'review'].includes(lowercaseStatus)) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Badge 
      variant={variant || getStatusVariant(status)}
      className={cn(getStatusColor(status), 'font-medium', className)}
    >
      {status}
    </Badge>
  );
};
