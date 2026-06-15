'use client';

import { useParams } from 'next/navigation';
import { useBusiness } from '@/hooks/useBusinesses';
import Link from 'next/link';

export default function BusinessDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { business, loading, error } = useBusiness(id);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Business not found'}
        </div>
        <Link href="/businesses" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to businesses
        </Link>
      </div>
    );
  }

  const formatAddress = () => {
    const parts = [business.address, business.city, business.state, business.zip]
      .filter(Boolean);
    return parts.join(', ');
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return <span className="text-gray-400">No reviews yet</span>;
    
    const fullStars = Math.floor(rating);
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-yellow-500 text-2xl">
          {'★'.repeat(fullStars)}
          {'☆'.repeat(5 - fullStars)}
        </span>
        <span className="text-gray-600">
          {rating.toFixed(1)} ({business.review_count} reviews)
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/businesses" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to businesses
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            {renderStars(business.rating)}
          </div>
        </div>

        {business.description && (
          <p className="text-gray-600 text-lg mb-6">{business.description}</p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Contact Information</h2>
            
            {formatAddress() && (
              <div className="mb-3">
                <p className="text-gray-600">{formatAddress()}</p>
              </div>
            )}

            {business.phone && (
              <div className="mb-2">
                <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                  {business.phone}
                </a>
              </div>
            )}

            {business.email && (
              <div className="mb-2">
                <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                  {business.email}
                </a>
              </div>
            )}

            {business.website && (
              <div>
                <a 
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit Website →
                </a>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Business Details</h2>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Member since:</span>
                <span className="ml-2">
                  {new Date(business.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {business.latitude && business.longitude && (
                <div>
                  <span className="text-gray-500">Location:</span>
                  <span className="ml-2">
                    {business.latitude.toFixed(4)}, {business.longitude.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section would go here */}
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Reviews</h2>
          <p className="text-gray-500">Reviews coming soon...</p>
        </div>
      </div>
    </div>
  );
}
