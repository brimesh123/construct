
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type JobSiteStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';

interface JobSiteStatusBadgeProps {
  jobSiteId: string;
  currentStatus: JobSiteStatus;
  onStatusChange?: (newStatus: JobSiteStatus) => void;
  editable?: boolean;
}

const JobSiteStatusBadge: React.FC<JobSiteStatusBadgeProps> = ({
  jobSiteId,
  currentStatus,
  onStatusChange,
  editable = false
}) => {
  const getStatusColor = (status: JobSiteStatus) => {
    switch (status) {
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'On Hold':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('job_sites')
        .update({ status: newStatus as JobSiteStatus })
        .eq('id', jobSiteId);

      if (error) throw error;

      toast.success('Job site status updated successfully');
      onStatusChange?.(newStatus as JobSiteStatus);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (!editable) {
    return (
      <Badge className={`${getStatusColor(currentStatus)} font-medium`}>
        {currentStatus}
      </Badge>
    );
  }

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-32">
        <SelectValue>
          <Badge className={`${getStatusColor(currentStatus)} font-medium border-none`}>
            {currentStatus}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectItem value="Planning">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 font-medium">
            Planning
          </Badge>
        </SelectItem>
        <SelectItem value="Active">
          <Badge className="bg-green-100 text-green-800 border-green-300 font-medium">
            Active
          </Badge>
        </SelectItem>
        <SelectItem value="On Hold">
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-medium">
            On Hold
          </Badge>
        </SelectItem>
        <SelectItem value="Completed">
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
            Completed
          </Badge>
        </SelectItem>
        <SelectItem value="Cancelled">
          <Badge className="bg-red-100 text-red-800 border-red-300 font-medium">
            Cancelled
          </Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default JobSiteStatusBadge;
