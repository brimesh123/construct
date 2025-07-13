import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Upload, FileText, Image, UserCheck, UserX } from 'lucide-react';
import ProjectManagerForm from './ProjectManagerForm';
import ProjectManagerEditForm from './ProjectManagerEditForm';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ProjectManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  type: string;
  sst_number: string;
  sst_expire_date: string;
  sst_image_url: string;
  is_active: boolean;
  assigned_sites: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
  }>;
}

const ProjectManagerList = () => {
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPM, setEditingPM] = useState<ProjectManager | null>(null);

  useEffect(() => {
    fetchProjectManagers();
  }, [searchTerm]);

  const fetchProjectManagers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employees')
        .select(`
          *,
          assigned_sites:job_sites!job_sites_assigned_pm_fkey(id, name, address, status)
        `)
        .eq('type', 'PM')
        .order('last_name');

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Add is_active field based on updated_at timestamp
      const managersWithStatus = data?.map(pm => ({
        ...pm,
        is_active: pm.updated_at ? new Date(pm.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : true
      })) || [];
      
      setProjectManagers(managersWithStatus);
    } catch (error: any) {
      toast.error('Failed to fetch project managers');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowForm(false);
    fetchProjectManagers();
  };

  const handleEditSuccess = () => {
    setEditingPM(null);
    fetchProjectManagers();
  };

  const handleEdit = (pm: ProjectManager) => {
    setEditingPM(pm);
  };

  const handleToggleActive = async (pmId: string, currentActive: boolean) => {
    try {
      // Update the database with a timestamp that determines active status
      const updateData = currentActive 
        ? { updated_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() } // Set to 31 days ago (inactive)
        : { updated_at: new Date().toISOString() }; // Set to now (active)

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', pmId);

      if (error) throw error;

      toast.success(`Project Manager ${currentActive ? 'deactivated' : 'activated'} successfully`);
      fetchProjectManagers();
    } catch (error: any) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to update status');
    }
  };

  const exportToExcel = () => {
    const exportData = projectManagers.map(pm => ({
      'Full Name': `${pm.first_name} ${pm.last_name}`,
      'Email': pm.email || 'N/A',
      'Mobile Number': pm.mobile_number || 'N/A',
      'Type': pm.type,
      'SST Number': pm.sst_number || 'N/A',
      'Status': pm.is_active ? 'Active' : 'Inactive',
      'Assigned Sites': pm.assigned_sites?.map(site => site.name).join(', ') || 'None',
      'Active Sites': pm.assigned_sites?.filter(site => site.status === 'Active').length || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Managers');
    
    const fileName = `project_managers_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Excel file downloaded successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Project Manager List', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    const tableData = projectManagers.map(pm => [
      `${pm.first_name} ${pm.last_name}`,
      pm.email || 'N/A',
      pm.type,
      pm.mobile_number || 'N/A',
      pm.sst_number || 'N/A',
      pm.is_active ? 'Active' : 'Inactive',
      pm.assigned_sites?.length || 0,
    ]);

    (doc as any).autoTable({
      head: [['Full Name', 'Email', 'Type', 'Mobile', 'SST', 'Status', 'Sites']],
      body: tableData,
      startY: 40,
    });

    doc.save(`project_managers_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF file downloaded successfully');
  };

  if (showForm) {
    return <ProjectManagerForm onSuccess={handleAddSuccess} onCancel={() => setShowForm(false)} />;
  }

  if (editingPM) {
    return <ProjectManagerEditForm 
      projectManager={editingPM} 
      onSuccess={handleEditSuccess} 
      onCancel={() => setEditingPM(null)} 
    />;
  }

  if (loading) {
    return (
      <Card className="border-2 border-orange-200 shadow-xl">
        <CardContent className="p-8">
          <div className="text-center text-orange-600">Loading project managers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <CardTitle className="text-2xl font-bold">PROJECT MANAGER LIST</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={exportToExcel} className="bg-white text-orange-600 hover:bg-orange-50">
              <Upload className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button variant="secondary" onClick={exportToPDF} className="bg-white text-orange-600 hover:bg-orange-50">
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-orange-700 hover:bg-orange-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project Manager
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 border-2 border-orange-200 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-orange-200 rounded-xl shadow-lg">
          <Table>
            <TableHeader className="bg-gradient-to-r from-orange-100 to-yellow-100">
              <TableRow>
                <TableHead className="text-orange-800 font-bold">Full Name</TableHead>
                <TableHead className="text-orange-800 font-bold hidden md:table-cell">Site Name</TableHead>
                <TableHead className="text-orange-800 font-bold hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-orange-800 font-bold hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-orange-800 font-bold hidden lg:table-cell">Mobile Number</TableHead>
                <TableHead className="text-orange-800 font-bold hidden lg:table-cell">SST</TableHead>
                <TableHead className="text-orange-800 font-bold hidden md:table-cell">Image</TableHead>
                <TableHead className="text-orange-800 font-bold">Status</TableHead>
                <TableHead className="text-orange-800 font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectManagers.map((pm) => (
                <TableRow key={pm.id} className="hover:bg-orange-50 transition-colors">
                  <TableCell className="font-semibold text-orange-900">
                    <div>
                      {pm.first_name} {pm.last_name}
                      <div className="lg:hidden text-sm text-gray-600 mt-1">
                        {pm.email || 'No email'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="bg-gradient-to-r from-orange-400 to-yellow-400 text-white px-3 py-1 rounded-full text-center font-medium text-sm">
                      {pm.assigned_sites?.[0]?.name || 'No site assigned'}
                    </div>
                  </TableCell>
                  <TableCell className="text-orange-700 hidden lg:table-cell">
                    {pm.email || 'N/A'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                      {pm.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-orange-700 hidden lg:table-cell">
                    {pm.mobile_number || 'N/A'}
                  </TableCell>
                  <TableCell className="text-orange-700 hidden lg:table-cell">
                    {pm.sst_number || 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {pm.sst_image_url ? (
                      <div className="w-12 h-8 bg-gray-200 border rounded flex items-center justify-center">
                        <Image className="h-4 w-4 text-gray-500" />
                      </div>
                    ) : (
                      <div className="w-12 h-8 bg-gray-100 border rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">No Image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={pm.is_active ? "default" : "secondary"}
                      className={pm.is_active 
                        ? "bg-green-500 text-white hover:bg-green-600" 
                        : "bg-red-100 text-red-800 border-red-200"
                      }
                    >
                      {pm.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pm)}
                        className="text-orange-600 hover:bg-orange-100 border border-orange-200"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Edit</span>
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(pm.id, pm.is_active)}
                        className={pm.is_active 
                          ? "bg-red-500 hover:bg-red-600 text-white" 
                          : "bg-green-500 hover:bg-green-600 text-white"
                        }
                        size="sm"
                      >
                        {pm.is_active ? (
                          <>
                            <UserX className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Activate</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {projectManagers.length === 0 && (
          <div className="text-center py-8 text-orange-600">
            No project managers found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectManagerList;
