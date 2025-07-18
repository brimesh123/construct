
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { Edit, Trash2, Search, Plus, Download, FileSpreadsheet, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface JobSite {
  id: string;
  name: string;
  address?: string;
  assigned_pm?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  pm_name?: string;
}

interface JobSiteListProps {
  onEdit: (jobSite: JobSite) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

type JobSiteStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';

const JobSiteList = ({ onEdit, onAdd, refreshTrigger }: JobSiteListProps) => {
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobSiteStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchJobSites();
  }, [refreshTrigger, searchTerm, statusFilter, currentPage]);

  const fetchJobSites = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('job_sites')
        .select(`
          *,
          employees!job_sites_assigned_pm_fkey (
            first_name,
            last_name
          )
        `, { count: 'exact' })
        .order('name');

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      const formattedData = data?.map(site => ({
        ...site,
        pm_name: site.employees ? `${site.employees.first_name} ${site.employees.last_name}` : 'Unassigned'
      })) || [];

      setJobSites(formattedData);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error: any) {
      toast({
        title: 'Error fetching job sites',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteJobSite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job site?')) return;

    try {
      const { error } = await supabase
        .from('job_sites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Job site deleted successfully' });
      fetchJobSites();
    } catch (error: any) {
      toast({
        title: 'Error deleting job site',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToExcel = () => {
    const exportData = jobSites.map(site => ({
      'Job Site Name': site.name,
      'Address': site.address || '',
      'Project Manager': site.pm_name,
      'Status': site.status,
      'Start Date': site.start_date || '',
      'End Date': site.end_date || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Job Sites');
    XLSX.writeFile(wb, `job-sites-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: 'Excel file downloaded successfully' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Planning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'On Hold': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <TooltipProvider>
      <Card className="border-2 border-orange-200 shadow-2xl bg-white">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Job Sites Management</CardTitle>
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={exportToExcel} 
                    variant="outline" 
                    className="bg-white text-orange-600 border-2 border-white hover:bg-orange-50 hover:text-orange-700 font-medium"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export job sites to Excel file</p>
                </TooltipContent>
              </Tooltip>

              <Button 
                onClick={onAdd}
                className="bg-white text-orange-600 hover:bg-orange-50 font-medium shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Job Site
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-300" />
              <Input
                placeholder="Search job sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-orange-300 bg-white/90 text-gray-800 placeholder-gray-500 focus:border-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | JobSiteStatus)}>
              <SelectTrigger className="w-48 border-2 border-orange-300 bg-white/90 text-gray-800 focus:border-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-orange-200 shadow-lg">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border-2 border-orange-100 shadow-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50 border-b-2 border-orange-200">
                      <TableHead className="font-bold text-orange-800 text-lg">Name</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">Address</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">Project Manager</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">Status</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">Start Date</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">End Date</TableHead>
                      <TableHead className="font-bold text-orange-800 text-lg">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobSites.map((site, index) => (
                      <TableRow key={site.id} className={`hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50'}`}>
                        <TableCell className="font-semibold text-gray-800 text-lg">{site.name}</TableCell>
                        <TableCell className="text-gray-600">{site.address || '-'}</TableCell>
                        <TableCell className="text-gray-600">{site.pm_name}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(site.status)} border font-medium text-sm px-3 py-1`}>
                            {site.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{site.start_date || '-'}</TableCell>
                        <TableCell className="text-gray-600">{site.end_date || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Job Site Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  <div><b>Name:</b> {site.name}</div>
                                  <div><b>Address:</b> {site.address || '-'}</div>
                                  <div><b>Project Manager:</b> {site.pm_name}</div>
                                  <div><b>Status:</b> {site.status}</div>
                                  <div><b>Start Date:</b> {site.start_date || '-'}</div>
                                  <div><b>End Date:</b> {site.end_date || '-'}</div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEdit(site)}
                                  className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit job site</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteJobSite(site.id)}
                                  className="border-2 border-red-200 text-red-600 hover:bg-red-500 hover:text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete job site</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {jobSites.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">No job sites found matching your criteria</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center mt-8 space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white font-medium"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-6 py-2 bg-orange-100 text-orange-800 rounded-lg font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white font-medium"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default JobSiteList;
