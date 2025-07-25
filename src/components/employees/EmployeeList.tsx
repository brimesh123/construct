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
import { Edit, Trash2, Search, Plus, Filter, Upload, FileText, AlertTriangle, Eye, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const requiredColumns = ['first_name', 'last_name', 'type', 'email', 'mobile_number', 'regular_rate', 'overtime_rate'];

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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [failedRows, setFailedRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editableRows, setEditableRows] = useState<any[]>([]);
  const [columnMismatchInfo, setColumnMismatchInfo] = useState<null | { required: string[], found: string[], missing: string[], extra: string[] }>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters/search change
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger, searchTerm, typeFilter, currentPage, itemsPerPage]);

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
      setTotalCount(count || 0);
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
      case 'PM': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Foreman': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  // Handle file upload
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('handleImportFile called', file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      console.log('Parsed rows:', rows);
      if (!rows || rows.length === 0) {
        toast({ title: 'Import Error', description: 'No data found in the Excel file.', variant: 'destructive' });
        return;
      }
      // Column structure check
      const fileColumns = Object.keys(rows[0] || {});
      const missing = requiredColumns.filter(col => !fileColumns.includes(col));
      const extra = fileColumns.filter(col => !requiredColumns.includes(col));
      if (missing.length > 0 || extra.length > 0) {
        setColumnMismatchInfo({ required: requiredColumns, found: fileColumns, missing, extra });
        return;
      }
      setImportedRows(rows as any[]);
      setEditableRows(rows as any[]);
      setSelectedRows(rows.map((_, idx) => idx));
      setImportDialogOpen(true);
      setImportErrors([]);
      setFailedRows([]);
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      toast({ title: 'Import Error', description: 'Failed to read the Excel file.', variant: 'destructive' });
    };
    reader.readAsArrayBuffer(file);
  };

  // Validate and bulk insert
  const handleImportConfirm = async () => {
    const errors: string[] = [];
    const failed: any[] = [];
    // Fetch all existing employees for duplicate check
    const { data: existingEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('first_name, last_name, email, mobile_number');
    if (fetchError) {
      setImportErrors(['Failed to fetch existing employees for duplicate check']);
      toast({ title: 'Import Error', description: 'Failed to fetch existing employees.', variant: 'destructive' });
      return;
    }
    // Helper to check for duplicate
    const isDuplicate = (row: any) => {
      return existingEmployees.some((emp: any) =>
        ((String(emp.first_name || '').trim().toLowerCase() === String(row.first_name || '').trim().toLowerCase() &&
          String(emp.last_name || '').trim().toLowerCase() === String(row.last_name || '').trim().toLowerCase()) ||
         (!!row.email && !!emp.email && String(emp.email).trim().toLowerCase() === String(row.email).trim().toLowerCase()) ||
         (!!row.mobile_number && !!emp.mobile_number && String(emp.mobile_number).trim() === String(row.mobile_number).trim()))
      );
    };
    const selectedToImport = selectedRows.map(idx => editableRows[idx]);
    const validRows = selectedToImport.filter((row, idx) => {
      const missing = [];
      if (!row.first_name) missing.push('first_name');
      if (!row.last_name) missing.push('last_name');
      if (!row.type || !['Employee', 'Foreman', 'PM'].includes(row.type)) missing.push('type');
      if (row.regular_rate === undefined || isNaN(Number(row.regular_rate))) missing.push('regular_rate');
      if (row.overtime_rate === undefined || isNaN(Number(row.overtime_rate))) missing.push('overtime_rate');
      if (missing.length > 0) {
        errors.push(`Row ${idx + 2}: Missing/invalid ${missing.join(', ')}`);
        failed.push({ ...row, reason: `Missing/invalid ${missing.join(', ')}` });
        return false;
      }
      if (isDuplicate(row)) {
        errors.push(`Row ${idx + 2}: Already exists (duplicate name/email/mobile)`);
        failed.push({ ...row, reason: 'Already exists (duplicate name/email/mobile)' });
        return false;
      }
      return true;
    });
    setImportErrors(errors);
    setFailedRows([]);
    if (validRows.length === 0) {
      setFailedRows(failed);
      toast({ title: 'Import Error', description: 'No valid rows to import.', variant: 'destructive' });
      return;
    }
    // Insert valid rows
    const { error, data } = await supabase.from('employees').insert(validRows);
    console.log('Supabase insert response:', { error, data });
    if (error) {
      // If DB error, mark all as failed with DB error reason
      setFailedRows([...failed, ...validRows.map(row => ({ ...row, reason: error.message }))]);
      setImportErrors([...(errors || []), error.message]);
      toast({ title: 'Import Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Only show failed rows (if any)
    setFailedRows(failed);
    setImportDialogOpen(failed.length > 0); // Keep dialog open if there are failed rows
    setImportedRows([]);
    setImportErrors([]);
    toast({ title: 'Import Successful', description: `${validRows.length} employees imported.`, variant: 'default' });
    // Optionally, refresh employee list here
    fetchEmployees();
  };

  return (
    <Card className="border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <CardTitle className="text-2xl font-bold">EMPLOYEE LIST</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={exportToExcel} className="bg-white text-orange-600 hover:bg-orange-50">
              <Upload className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button variant="secondary" onClick={exportToPDF} className="bg-white text-orange-600 hover:bg-orange-50">
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
            <label className="flex items-center gap-2 border-2 border-orange-500 text-orange-700 bg-white hover:bg-orange-50 rounded-lg font-semibold px-3 py-1 cursor-pointer">
              <Download className="h-4 w-4" /> Import Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
            </label>
            <Button onClick={onAdd} className="bg-orange-700 hover:bg-orange-800">
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
              className="pl-8 border-2 border-orange-200 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(value: EmployeeTypeFilter) => setTypeFilter(value)}>
              <SelectTrigger className="w-40 border-2 border-orange-200 focus:border-orange-500">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-orange-200 shadow-lg">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
                <SelectItem value="Foreman">Foreman</SelectItem>
                <SelectItem value="PM">Project Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="border-2 border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-2 border-orange-200 rounded-xl shadow-lg">
              <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
                  <tr>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden sm:table-cell">Type</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden md:table-cell">Email</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden lg:table-cell">Mobile</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden lg:table-cell">SST Number</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden xl:table-cell">Regular Rate</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden xl:table-cell">Overtime Rate</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, idx) => (
                    <tr key={employee.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', height: '36px' }}>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        <div>
                          {employee.first_name} {employee.last_name}
                          <div className="sm:hidden text-sm text-gray-600 mt-1">
                            {employee.type}
                          </div>
                          <div className="md:hidden text-sm text-gray-600 mt-1">
                            {employee.email || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="hidden sm:table-cell">
                        <Badge className={getTypeColor(employee.type)}>
                          {employee.type}
                        </Badge>
                      </td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden md:table-cell">{employee.email || '-'}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden lg:table-cell">{employee.mobile_number || '-'}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden lg:table-cell">{employee.sst_number || '-'}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden xl:table-cell">${employee.regular_rate.toFixed(2)}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden xl:table-cell">${employee.overtime_rate.toFixed(2)}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-orange-600 hover:bg-orange-100 border border-orange-200 p-2 rounded-full">
                                <Eye className="h-4 w-4" />
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
                            className="text-orange-600 hover:bg-orange-100 border border-orange-200 p-2 rounded-full"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteEmployee(employee)}
                            className="text-red-600 hover:bg-red-100 border border-red-200 p-2 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {employees.length === 0 && (
              <div className="text-center py-8 text-orange-600">
                No employees found matching your criteria.
              </div>
            )}

            {/* Pagination bar below table */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 mt-4 rounded-b-xl">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2">&#171;</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2">&#8249;</button>
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val) || val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    setCurrentPage(val);
                  }}
                  className="w-12 border rounded text-center"
                />
                <span>of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2">&#8250;</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2">&#187;</button>
              </div>
              <div className="flex items-center gap-2">
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
                  {[5, 10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <span>items per page</span>
                <span className="ml-4 text-gray-600 text-sm">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items</span>
              </div>
            </div>
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
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                <span className="text-orange-800 font-medium">Note:</span>
              </div>
              <p className="text-orange-700 text-sm mt-1">
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

      {/* In the CardContent render, always render the Dialog for import preview, not conditionally */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setEditableRows([]);
          setSelectedRows([]);
          setImportedRows([]);
          setImportErrors([]);
          setFailedRows([]);
        }
      }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Import Employees Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto max-h-96 mb-2">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">
                    <input type="checkbox" checked={selectedRows.length === editableRows.length && editableRows.length > 0} onChange={e => setSelectedRows(e.target.checked ? editableRows.map((_, idx) => idx) : [])} />
                  </th>
                  <th className="border px-2 py-1">First Name</th>
                  <th className="border px-2 py-1">Last Name</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Mobile</th>
                  <th className="border px-2 py-1">Regular Rate</th>
                  <th className="border px-2 py-1">Overtime Rate</th>
                </tr>
              </thead>
              <tbody>
                {editableRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-center">
                      <input type="checkbox" checked={selectedRows.includes(idx)} onChange={e => setSelectedRows(e.target.checked ? [...selectedRows, idx] : selectedRows.filter(i => i !== idx))} />
                    </td>
                    <td className="border px-2 py-1">
                      <input value={row.first_name || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], first_name: e.target.value }; return copy; })} className="w-24 border rounded px-1" />
                    </td>
                    <td className="border px-2 py-1">
                      <input value={row.last_name || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], last_name: e.target.value }; return copy; })} className="w-24 border rounded px-1" />
                    </td>
                    <td className="border px-2 py-1">
                      <select value={row.type || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], type: e.target.value }; return copy; })} className="w-24 border rounded px-1">
                        <option value="">Select</option>
                        <option value="Employee">Employee</option>
                        <option value="Foreman">Foreman</option>
                        <option value="PM">PM</option>
                      </select>
                    </td>
                    <td className="border px-2 py-1">
                      <input value={row.email || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], email: e.target.value }; return copy; })} className="w-32 border rounded px-1" />
                    </td>
                    <td className="border px-2 py-1">
                      <input value={row.mobile_number || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], mobile_number: e.target.value }; return copy; })} className="w-24 border rounded px-1" />
                    </td>
                    <td className="border px-2 py-1">
                      <input type="number" value={row.regular_rate || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], regular_rate: e.target.value }; return copy; })} className="w-20 border rounded px-1" />
                    </td>
                    <td className="border px-2 py-1">
                      <input type="number" value={row.overtime_rate || ''} onChange={e => setEditableRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], overtime_rate: e.target.value }; return copy; })} className="w-20 border rounded px-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importErrors.length > 0 && (
            <div className="text-red-600 text-sm mb-2">
              {importErrors.map((err, i) => <div key={i}>{err}</div>)}
            </div>
          )}
          {failedRows.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-red-700 mb-2">Rows Not Imported:</div>
              <div className="overflow-x-auto max-h-40">
                <table className="min-w-full border text-xs">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">First Name</th>
                      <th className="border px-2 py-1">Last Name</th>
                      <th className="border px-2 py-1">Type</th>
                      <th className="border px-2 py-1">Email</th>
                      <th className="border px-2 py-1">Mobile</th>
                      <th className="border px-2 py-1">Regular Rate</th>
                      <th className="border px-2 py-1">Overtime Rate</th>
                      <th className="border px-2 py-1 text-red-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1">{row.first_name}</td>
                        <td className="border px-2 py-1">{row.last_name}</td>
                        <td className="border px-2 py-1">{row.type}</td>
                        <td className="border px-2 py-1">{row.email}</td>
                        <td className="border px-2 py-1">{row.mobile_number}</td>
                        <td className="border px-2 py-1">{row.regular_rate}</td>
                        <td className="border px-2 py-1">{row.overtime_rate}</td>
                        <td className="border px-2 py-1 text-red-700">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleImportConfirm} disabled={importedRows.length === 0}>Import</Button>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportedRows([]); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!columnMismatchInfo} onOpenChange={open => { if (!open) setColumnMismatchInfo(null); }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Column Mismatch</DialogTitle>
          </DialogHeader>
          {columnMismatchInfo && (
            <div className="space-y-2">
              <div className="text-red-700 font-semibold">The columns in your file do not match the required structure.</div>
              <div><b>Required columns:</b> <span className="text-orange-700">{columnMismatchInfo.required.join(', ')}</span></div>
              <div><b>File columns:</b> <span className="text-orange-700">{columnMismatchInfo.found.join(', ')}</span></div>
              {columnMismatchInfo.missing.length > 0 && (
                <div className="text-orange-700">Missing: {columnMismatchInfo.missing.join(', ')}</div>
              )}
              {columnMismatchInfo.extra.length > 0 && (
                <div className="text-orange-700">Extra: {columnMismatchInfo.extra.join(', ')}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnMismatchInfo(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmployeeList;
