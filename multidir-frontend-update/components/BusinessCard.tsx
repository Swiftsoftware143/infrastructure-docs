import Link from 'next/link';
import { Business } from '@/lib/api/client';

interface BusinessCardProps {
  business: Business;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  const formatAddress = () => {
    const parts = [business.address, business.city, business.state, business.zip]
      .filter(Boolean);
    return parts.join(', ');
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return <span className="text-gray-400">No reviews</span>;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        <span className="text-yellow-500">
          {'★'.repeat(fullStars)}
          {hasHalfStar && '½'}
        </span>
        <span className="text-gray-600 text-sm">({business.review_count} reviews)</span>
      </div>
    );
  };

  return (
    <Link href={`/businesses/${business.id}`}>
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
            {business.description && (
              <p className="text-gray-600 mt-1 line-clamp-2">{business.description}</p>
            )}
          </div>
          <div className="text-right">
            {renderStars(business.rating)}
          </div>
        </div>
        
        {formatAddress() && (
          <p className="text-gray-500 text-sm mt-2">{formatAddress()}</p>
        )}
        
        <div className="flex gap-4 mt-3 text-sm">
          {business.phone && (
            <a 
              href={`tel:${business.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:underline"
            >
              {business.phone}
            </a>
          )}
          {business.website && (
            <a 
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:underline"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
