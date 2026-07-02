// src/app/edit-listing/[id]/EditListingForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { listingSchema } from "../../../lib/validation";
import { ErrorNotification, useNotification } from "../../../components/ErrorNotification";
import type { Listing } from "../../../lib/types";

const CATEGORIES = ["Electronics", "Textbooks", "Furniture", "Food", "Services", "Other"] as const;

interface EditListingFormProps {
  listing: Listing;
}

export default function EditListingForm({ listing }: EditListingFormProps) {
  const router = useRouter();
  const { notification, showError, showSuccess, clearNotification } = useNotification();

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(listing.price.toString());
  const [category, setCategory] = useState(listing.category);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = async () => {
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

    setLoading(true);

    try {
      const { error } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          category,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);

      if (error) {
        showError(`Failed to update listing: ${error.message}`);
        setLoading(false);
        return;
      }

      showSuccess("✅ Listing updated successfully!");
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/listing/${listing.id}`);
      }, 1500);
    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      {notification && (
        <ErrorNotification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}

      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
        >
          ← Go Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Edit Listing</h1>
        <p className="text-gray-600">
          Make changes to your listing below. Only you can edit your own items.
        </p>
      </div>

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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Note:</span> The image and creation date cannot be changed. To update the image, delete this listing and create a new one.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 font-medium py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
