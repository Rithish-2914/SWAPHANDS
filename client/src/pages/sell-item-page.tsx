import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { NavigationHeader } from "@/components/navigation-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X } from "lucide-react";

export default function SellItemPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    price: "",
    location: "",
    isExchangeable: false,
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoURLs, setPhotoURLs] = useState<string[]>([]);

  const createItemMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/items", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item listed successfully!",
        description: "Your item is now available in the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-items"] });
      setLocation("/my-items");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to list item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "You can upload maximum 5 photos",
        variant: "destructive",
      });
      return;
    }

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Create preview URLs
    const newURLs = files.map(file => URL.createObjectURL(file));
    setPhotoURLs([...photoURLs, ...newURLs]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newURLs = photoURLs.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(photoURLs[index]);
    
    setPhotos(newPhotos);
    setPhotoURLs(newURLs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category || 
        !formData.condition || !formData.price || !formData.location) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value.toString());
    });
    
    photos.forEach(photo => {
      data.append("photos", photo);
    });

    createItemMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>List New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Photos */}
              <div>
                <Label className="text-base font-medium">Item Photos</Label>
                <div className="mt-2">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Drop photos here or click to upload</p>
                    <p className="text-xs text-muted-foreground mb-4">Maximum 5 photos, up to 10MB each</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                      data-testid="input-photos"
                    />
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        Choose Files
                      </label>
                    </Button>
                  </div>
                  
                  {/* Photo previews */}
                  {photoURLs.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {photoURLs.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removePhoto(index)}
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Item Title */}
              <div>
                <Label htmlFor="title">Item Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., iPhone 13 128GB Blue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-title"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Describe your item in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  data-testid="textarea-description"
                />
              </div>

              {/* Category and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="gadgets">Gadgets</SelectItem>
                      <SelectItem value="uniforms">Uniforms</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    data-testid="input-price"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label>Location *</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                  <SelectTrigger data-testid="select-location">
                    <SelectValue placeholder="Select hostel block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a-block">A-Block</SelectItem>
                    <SelectItem value="b-block">B-Block</SelectItem>
                    <SelectItem value="c-block">C-Block</SelectItem>
                    <SelectItem value="d-block">D-Block</SelectItem>
                    <SelectItem value="e-block">E-Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Condition */}
              <div>
                <Label className="text-base font-medium">Condition *</Label>
                <RadioGroup
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2"
                >
                  {["new", "excellent", "good", "fair"].map((condition) => (
                    <div key={condition} className="flex items-center space-x-2 p-3 border border-input rounded-md">
                      <RadioGroupItem value={condition} id={condition} data-testid={`radio-${condition}`} />
                      <Label htmlFor={condition} className="text-sm capitalize cursor-pointer">
                        {condition}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Exchange Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exchangeable"
                  checked={formData.isExchangeable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isExchangeable: !!checked })}
                  data-testid="checkbox-exchangeable"
                />
                <Label htmlFor="exchangeable" className="text-sm cursor-pointer">
                  Open to exchange
                </Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={createItemMutation.isPending}
                  data-testid="button-list-item"
                >
                  {createItemMutation.isPending ? "Listing..." : "List Item"}
                </Button>
                <Button type="button" variant="outline" className="px-6" data-testid="button-save-draft">
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
