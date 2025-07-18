
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Search, Download, Upload, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  regular_rate: number;
  overtime_rate: number;
  type: string;
}

interface RateCardListProps {
  onEdit: (rateCard: any) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

const RateCardList = ({ onEdit, onAdd, refreshTrigger }: RateCardListProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger, debouncedSearchTerm, currentPage]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .order('last_name', { ascending: true });

      if (debouncedSearchTerm) {
        query = query.or(`first_name.ilike.%${debouncedSearchTerm}%,last_name.ilike.%${debouncedSearchTerm}%`);
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

  const handleEdit = (employee: Employee) => {
    onEdit(employee);
  };

  const exportToExcel = () => {
    const exportData = employees.map(employee => ({
      'Employee': `${employee.first_name} ${employee.last_name}`,
      'Type': employee.type,
      'Valid From': format(new Date(), 'MMM dd, yyyy'),
      'Regular Rate': `$${(employee.regular_rate || 0).toFixed(2)}/hr`,
      'Overtime Rate': `$${(employee.overtime_rate || 0).toFixed(2)}/hr`,
      'Status': 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rate Cards');
    
    const fileName = `rate_cards_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ title: 'Excel file downloaded successfully' });
  };

  const exportToCSV = () => {
    const exportData = employees.map(employee => ({
      'Employee': `${employee.first_name} ${employee.last_name}`,
      'Type': employee.type,
      'Valid From': format(new Date(), 'MMM dd, yyyy'),
      'Regular Rate': `$${(employee.regular_rate || 0).toFixed(2)}/hr`,
      'Overtime Rate': `$${(employee.overtime_rate || 0).toFixed(2)}/hr`,
      'Status': 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rate_cards_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'CSV file downloaded successfully' });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PM': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Foreman': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-orange-300 shadow-xl">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-orange-700">Loading employee rates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <CardTitle className="text-2xl font-bold">EMPLOYEE RATE CARDS</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={exportToExcel} className="bg-white text-orange-600 hover:bg-orange-50">
              <Upload className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={exportToCSV} className="bg-white text-orange-600 hover:bg-orange-50">
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        {/* Search Employee Dropdown for Add/Edit Rate */}
        <div className="mt-6 max-w-md">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px] bg-white text-orange-800"
              >
                <span className="text-left truncate">Search employee to add/edit rate...</span>
                <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[380px]">
              <Command>
                <CommandInput placeholder="Search employees..." className="h-12 text-base px-4" />
                <CommandList className="max-h-72">
                  {employees.map(emp => (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.first_name} ${emp.last_name}`}
                      onSelect={() => onEdit(emp)}
                      className="flex items-center gap-3 px-4 py-3 text-base cursor-pointer hover:bg-accent"
                    >
                      <span>{emp.first_name} {emp.last_name}</span>
                      <Badge className={`ml-2 ${getTypeColor(emp.type)} w-fit`}>{emp.type}</Badge>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 border-2 border-orange-200 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-orange-200 rounded-xl shadow-lg">
          <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
              <tr>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Employee</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden sm:table-cell">Valid From</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden md:table-cell">Regular Rate</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden md:table-cell">Overtime Rate</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} className="hidden lg:table-cell">Status</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, idx) => (
                <tr key={employee.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', height: '36px' }}>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    <div>
                      <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                      <Badge className={`${getTypeColor(employee.type)} text-xs mt-1`}>
                        {employee.type}
                      </Badge>
                      <div className="sm:hidden text-sm text-gray-600 mt-1">
                        {format(new Date(), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden sm:table-cell">
                    {format(new Date(), 'MMM dd, yyyy')}
                  </td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden md:table-cell">${(employee.regular_rate || 0).toFixed(2)}/hr</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="text-orange-700 hidden md:table-cell">${(employee.overtime_rate || 0).toFixed(2)}/hr</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }} className="hidden lg:table-cell">
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">Active</Badge>
                  </td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(employee)}
                      className="text-orange-600 hover:bg-orange-100 border border-orange-200 p-2 rounded-full"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
            <span className="ml-4 text-gray-600 text-sm">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, employees.length)} of {employees.length} items</span>
          </div>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-8 text-orange-600">
            No employees found matching your criteria.
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default RateCardList;
