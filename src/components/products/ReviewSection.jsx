import { useState } from 'react';
import { motion } from 'framer-motion';
import { files, reviews } from '@/services/api';
import { Star, Upload, X, Loader2 } from 'lucide-react';

export default function ReviewSection({ productId, productTitle, userEmail, userName }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5 MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || !reviewText.trim()) {
      setError('Please provide a rating and review text');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedFile) {
        const { file_url } = await files.upload(selectedFile);
        imageUrl = file_url;
      }

      // Save review to a Review entity (you'll need to create this entity)
      await reviews.create({
        product_id: productId,
        product_title: productTitle,
        user_email: userEmail,
        user_name: userName,
        rating,
        text: reviewText,
        image_url: imageUrl,
      });

      setSubmitted(true);
      setRating(0);
      setReviewText('');
      clearFile();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError('Failed to submit review. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-5 my-8 p-6 bg-white rounded-2xl border border-border/20"
    >
      <h3 className="font-cormorant text-xl text-rain-cloud font-light mb-6">Share Your Experience</h3>

      {submitted ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-forest-canopy/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <p className="font-inter text-sm text-rain-cloud">Thank you for your review!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="font-inter text-xs text-rain-cloud/50 block mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className="transition-all"
                >
                  <Star
                    className={`w-6 h-6 ${
                      r <= rating
                        ? 'fill-warm-turmeric text-warm-turmeric'
                        : 'text-rain-cloud/20'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label className="font-inter text-xs text-rain-cloud/50 block mb-2">Your Review</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this product..."
              className="w-full px-4 py-3 rounded-lg border border-border font-inter text-sm focus:outline-none focus:ring-2 focus:ring-wet-earth/20 resize-none"
              rows={4}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="font-inter text-xs text-rain-cloud/50 block mb-2">Add a Photo (Optional)</label>

            {preview ? (
              <div className="relative w-full max-w-xs">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                >
                  <X className="w-4 h-4 text-rain-cloud" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-lg border-2 border-dashed border-border/40 cursor-pointer hover:border-border/60 transition-colors">
                <Upload className="w-5 h-5 text-rain-cloud/40" />
                <span className="font-inter text-sm text-rain-cloud/50 text-center">
                  Click to upload (Max 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 font-inter">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}