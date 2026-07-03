// src/app/post/page.tsx
"use client";



import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { listingSchema } from "../../lib/validation";
import { ErrorNotification, useNotification } from "../../components/ErrorNotification";
import ProtectedRoute from "../../components/ProtectedRoute";
import type { CreateListingRequest } from "../../lib/types";
import FooterContactLink from "../../components/FooterContactLink";



const CATEGORIES = ["Electronics", "Textbooks", "Furniture", "Food", "Services", "Other"] as const;

function PostItemForm() {
  const router = useRouter();
  const { notification, showError, showSuccess, clearNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<CreateListingRequest["category"]>("Electronics");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showError("Please login first");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, showError]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Image must be smaller than 5MB");
      return;
    }

    setImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createListing = async () => {
    // Reset errors
    setErrors({});

    // Validate form data
    try {
      listingSchema.parse({
        title,
        description,
        price: Number(price),
        category,
      });
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors.forEach((err: any) => {
        newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      showError("Please fix the errors below");
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        showError("Please login first");
        setSubmitting(false);
        return;
      }

      let imageUrl: string | null = null;

      // Upload image if provided
      if (image) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${image.name}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(fileName, image);

        if (uploadError) {
          showError(`Image upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      // Create listing
      const { error: insertError } = await supabase.from("listings").insert([
        {
          seller_id: userData.user.id,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          category,
          image_url: imageUrl,
        },
      ]);

      if (insertError) {
        showError(`Failed to create listing: ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      showSuccess("✅ Listing created successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("Electronics");
      setImage(null);
      setImagePreview(null);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/my-listings");
      }, 1500);
    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      {notification && (
        <ErrorNotification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}

      <h1 className="text-3xl font-bold mb-2">Post an Item for Sale</h1>
      <p className="text-gray-600 mb-6">
        Fill out the form below to list your item on Ra Zamzama
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., iPhone 13 Pro (256GB, Space Black)"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: "" });
              }}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">{title.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Describe the item condition, features, and any defects..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: "" });
              }}
              rows={5}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">{description.length}/2000</p>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Price (R) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">R</span>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors({ ...errors, price: "" });
                }}
                className={`w-full border rounded-lg px-4 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-w-xs mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-700">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={createListing}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {submitting ? "Creating Listing..." : "Create Listing"}
          </button>
        </div>
      </div>
      <FooterContactLink />
      
      
    </main>
  );
}

export default function PostItem() {
  return (
    <ProtectedRoute require="verified">
      <PostItemForm />
    </ProtectedRoute>
  );
}