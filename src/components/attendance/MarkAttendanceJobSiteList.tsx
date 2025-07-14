import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface JobSite {
  id: string;
  name: string;
}

interface MarkAttendanceJobSiteListProps {
  onMarkAttendance: (jobSite: JobSite) => void;
}

const MarkAttendanceJobSiteList = ({ onMarkAttendance }: MarkAttendanceJobSiteListProps) => {
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobSites();
  }, [searchTerm]);

  const fetchJobSites = async () => {
    setLoading(true);
    let query = supabase.from('job_sites').select('id, name').order('name');
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (!error) setJobSites(data || []);
    setLoading(false);
  };

  return (
    <Card className="border-2 border-orange-200 shadow-2xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Job Site List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <Button variant="outline" size="sm" disabled>Export to Excel</Button>
            <Button variant="outline" size="sm" className="ml-2" disabled>Export to PDF</Button>
          </div>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="overflow-x-auto rounded-lg border shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site Name</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
              ) : jobSites.length === 0 ? (
                <TableRow><TableCell colSpan={2}>No job sites found</TableCell></TableRow>
              ) : (
                jobSites.map(site => (
                  <TableRow key={site.id}>
                    <TableCell>{site.name}</TableCell>
                    <TableCell>
                      <Button onClick={() => onMarkAttendance(site)} className="bg-blue-800 text-white">Mark Attendance</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarkAttendanceJobSiteList; 