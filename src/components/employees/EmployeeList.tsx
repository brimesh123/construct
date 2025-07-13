import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Edit, Trash2, Search, Plus, Filter, Upload, FileText, AlertTriangle, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  type: string;
  mobile_number?: string;
  email?: string;
  sst_number?: string;
  sst_expire_date?: string;
  regular_rate: number;
  overtime_rate: number;
}

interface EmployeeListProps {
  onEdit: (employee: Employee) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

type EmployeeTypeFilter = 'all' | 'Employee' | 'Foreman' | 'PM';

const EmployeeList = ({ onEdit, onAdd, refreshTrigger }: EmployeeListProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<EmployeeTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [assignedJobSites, setAssignedJobSites] = useState<any[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger, searchTerm, typeFilter, currentPage]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .order('last_name');

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setEmployees(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error: any) {
      toast({
        title: 'Error fetching employees',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employee: Employee) => {
    try {
      // Check if this employee is assigned as PM to any job sites
      const { data: assignedJobSites, error: checkError } = await supabase
        .from('job_sites')
        .select('id, name')
        .eq('assigned_pm', employee.id);

      if (checkError) throw checkError;

      // If employee is assigned to job sites, show warning and proceed with unassignment
      if (assignedJobSites && assignedJobSites.length > 0) {
        const siteNames = assignedJobSites.map(site => site.name).join(', ');
        const confirmDelete = confirm(
          `This employee is assigned as Project Manager to the following job sites: ${siteNames}\n\n` +
          'These job sites will be set to "No PM assigned" and the employee will be deleted. Continue?'
        );
        
        if (!confirmDelete) return;

        // Remove assignments from job sites
        const { error: unassignError } = await supabase
          .from('job_sites')
          .update({ assigned_pm: null })
          .eq('assigned_pm', employee.id);

        if (unassignError) throw unassignError;

        toast({
          title: 'Job site assignments removed',
          description: `Removed PM assignment from ${assignedJobSites.length} job site(s)`,
        });
      }

      // Now proceed with normal deletion
      setEmployeeToDelete(employee);
      setAssignedJobSites([]);
      setShowDeleteDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error checking employee assignments',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    setDeleteLoading(true);
    try {
      // If employee is assigned to job sites, remove assignments first
      if (assignedJobSites.length > 0) {
        const { error: unassignError } = await supabase
          .from('job_sites')
          .update({ assigned_pm: null })
          .eq('assigned_pm', employeeToDelete.id);

        if (unassignError) throw unassignError;
      }

      // Now delete the employee
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeToDelete.id);

      if (error) throw error;

      toast({ title: 'Employee deleted successfully' });
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
      setAssignedJobSites([]);
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error deleting employee',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setEmployeeToDelete(null);
    setAssignedJobSites([]);
  };

  const exportToExcel = () => {
    const exportData = employees.map(emp => ({
      'Full Name': `${emp.first_name} ${emp.last_name}`,
      'Type': emp.type,
      'Email': emp.email || 'N/A',
      'Mobile Number': emp.mobile_number || 'N/A',
      'SST Number': emp.sst_number || 'N/A',
      'Regular Rate': emp.regular_rate.toFixed(2),
      'Overtime Rate': emp.overtime_rate.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    
    const fileName = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ title: 'Excel file downloaded successfully' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Employee List', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    const tableData = employees.map(emp => [
      `${emp.first_name} ${emp.last_name}`,
      emp.type,
      emp.email || 'N/A',
      emp.mobile_number || 'N/A',
      emp.sst_number || 'N/A',
      `$${emp.regular_rate.toFixed(2)}`,
      `$${emp.overtime_rate.toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      head: [['Full Name', 'Type', 'Email', 'Mobile', 'SST', 'Regular Rate', 'Overtime Rate']],
      body: tableData,
      startY: 40,
    });

    doc.save(`employees_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'PDF file downloaded successfully' });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Foreman': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  return (
    <Card className="border-2 border-blue-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <CardTitle className="text-2xl font-bold">EMPLOYEE LIST</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={exportToExcel} className="bg-white text-blue-600 hover:bg-blue-50">
              <Upload className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button variant="secondary" onClick={exportToPDF} className="bg-white text-blue-600 hover:bg-blue-50">
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
            <Button onClick={onAdd} className="bg-blue-700 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 border-2 border-blue-200 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(value: EmployeeTypeFilter) => setTypeFilter(value)}>
              <SelectTrigger className="w-40 border-2 border-blue-200 focus:border-blue-500">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-blue-200 shadow-lg">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
                <SelectItem value="Foreman">Foreman</SelectItem>
                <SelectItem value="PM">Project Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-2 border-blue-200 rounded-xl shadow-lg">
              <Table>
                <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                  <TableRow>
                    <TableHead className="text-blue-800 font-bold">Name</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden lg:table-cell">Mobile</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden lg:table-cell">SST Number</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden xl:table-cell">Regular Rate</TableHead>
                    <TableHead className="text-blue-800 font-bold hidden xl:table-cell">Overtime Rate</TableHead>
                    <TableHead className="text-blue-800 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-blue-50 transition-colors">
                      <TableCell className="font-semibold text-blue-900">
                        <div>
                          {employee.first_name} {employee.last_name}
                          <div className="sm:hidden text-sm text-gray-600 mt-1">
                            {employee.type}
                          </div>
                          <div className="md:hidden text-sm text-gray-600 mt-1">
                            {employee.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={getTypeColor(employee.type)}>
                          {employee.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-700 hidden md:table-cell">{employee.email || '-'}</TableCell>
                      <TableCell className="text-blue-700 hidden lg:table-cell">{employee.mobile_number || '-'}</TableCell>
                      <TableCell className="text-blue-700 hidden lg:table-cell">{employee.sst_number || '-'}</TableCell>
                      <TableCell className="text-blue-700 hidden xl:table-cell">${employee.regular_rate.toFixed(2)}</TableCell>
                      <TableCell className="text-blue-700 hidden xl:table-cell">${employee.overtime_rate.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-100 border border-blue-200">
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Employee Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                <div><b>Name:</b> {employee.first_name} {employee.last_name}</div>
                                <div><b>Type:</b> {employee.type}</div>
                                <div><b>Email:</b> {employee.email || '-'}</div>
                                <div><b>Mobile:</b> {employee.mobile_number || '-'}</div>
                                <div><b>SST Number:</b> {employee.sst_number || '-'}</div>
                                <div><b>SST Expiry:</b> {employee.sst_expire_date ? new Date(employee.sst_expire_date).toLocaleDateString() : '-'}</div>
                                <div><b>Regular Rate:</b> ${employee.regular_rate.toFixed(2)}</div>
                                <div><b>Overtime Rate:</b> ${employee.overtime_rate.toFixed(2)}</div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(employee)}
                            className="text-blue-600 hover:bg-blue-100 border border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteEmployee(employee)}
                            className="text-red-600 hover:bg-red-100 border border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {employees.length === 0 && (
              <div className="text-center py-8 text-blue-600">
                No employees found matching your criteria.
              </div>
            )}

            {/* Fix linter error: check if totalPages > 1 for pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-blue-700 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {employeeToDelete?.first_name} {employeeToDelete?.last_name}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">Note:</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                This will also delete all associated attendance records and rate cards for this employee.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? (
                <div className="animate-spin h-4 w-4 mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmployeeList;
