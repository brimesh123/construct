
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/common/FormField';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';

interface ProjectManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  sst_number: string;
  sst_expire_date: string;
  sst_image_url: string;
}

interface ProjectManagerEditFormProps {
  projectManager: ProjectManager;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectManagerEditForm: React.FC<ProjectManagerEditFormProps> = ({ 
  projectManager, 
  onSuccess, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: projectManager.first_name || '',
    last_name: projectManager.last_name || '',
    email: projectManager.email || '',
    mobile_number: projectManager.mobile_number || '',
    sst_number: projectManager.sst_number || '',
    sst_expire_date: projectManager.sst_expire_date || '',
  });
  const [sstImage, setSstImage] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSstImage(e.target.files[0]);
    }
  };

  const uploadSstImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `sst-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sst-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('sst-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let sstImageUrl = projectManager.sst_image_url;
      
      if (sstImage) {
        const newImageUrl = await uploadSstImage(sstImage);
        if (newImageUrl) {
          sstImageUrl = newImageUrl;
        } else {
          toast.error('Failed to upload SST image');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('employees')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          mobile_number: formData.mobile_number,
          sst_number: formData.sst_number,
          sst_expire_date: formData.sst_expire_date || null,
          sst_image_url: sstImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectManager.id);

      if (error) {
        throw error;
      }

      toast.success('Project Manager updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating project manager:', error);
      toast.error(error.message || 'Failed to update project manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Edit Project Manager</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              required
            />
            <FormField
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <FormField
              label="Mobile Number"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="SST Number"
              name="sst_number"
              value={formData.sst_number}
              onChange={handleInputChange}
            />
            <FormField
              label="SST Expire Date"
              name="sst_expire_date"
              type="date"
              value={formData.sst_expire_date}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">SST Image</label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1"
              />
              {sstImage && (
                <span className="text-sm text-green-600">
                  New file: {sstImage.name}
                </span>
              )}
              {projectManager.sst_image_url && !sstImage && (
                <span className="text-sm text-blue-600">
                  Current image uploaded
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Updating...' : 'Update Project Manager'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProjectManagerEditForm;
