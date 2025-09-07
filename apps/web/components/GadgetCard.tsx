'use client'

import React from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Star, ExternalLink, Heart, Bookmark } from 'lucide-react'
import { Gadget } from '@/lib/types'
import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/utils'

interface GadgetCardProps {
  gadget: Gadget
  onSave?: (gadgetId: string, action: 'save' | 'unsave') => void
  isSaved?: boolean
  showFullDetails?: boolean
}

export function GadgetCard({ gadget, onSave, isSaved = false, showFullDetails = false }: GadgetCardProps) {
  const averageRating = gadget.reviews && gadget.reviews.length > 0
    ? gadget.reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / gadget.reviews.length
    : null

  const handleSave = () => {
    if (onSave) {
      onSave(gadget.id, isSaved ? 'unsave' : 'save')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative h-48 w-full">
        {gadget.image_url ? (
          <Image
            src={gadget.image_url}
            alt={gadget.name}
            fill
            className="object-cover rounded-t-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 rounded-t-lg flex items-center justify-center">
            <div className="text-gray-400 text-lg">No Image</div>
          </div>
        )}
        
        {/* Save Button */}
        {onSave && (
          <button
            onClick={handleSave}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            title={isSaved ? 'Remove from saved' : 'Save gadget'}
          >
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-2">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">{gadget.name}</h3>
          {gadget.brand && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{gadget.brand}</p>
          )}
        </div>

        {/* Rating */}
        {averageRating && (
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(averageRating) 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {averageRating.toFixed(1)} ({gadget.reviews?.length} reviews)
            </span>
          </div>
        )}

        {/* Price */}
        {gadget.price && (
          <div className="mb-3">
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(gadget.price)}
            </span>
          </div>
        )}

        {/* Key Specs */}
        {gadget.specs && showFullDetails && (
          <div className="mb-3">
            <h4 className="font-medium text-sm text-[hsl(var(--muted-foreground))] mb-1">Key Specs:</h4>
            <div className="space-y-1">
              {Object.entries(gadget.specs).slice(0, 3).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))] capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-foreground font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Review Preview */}
        {gadget.reviews && gadget.reviews.length > 0 && showFullDetails && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Recent Review:</p>
            <p className="text-sm text-foreground line-clamp-2">
              "{gadget.reviews[0].content?.slice(0, 100)}..."
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              - {gadget.reviews[0].author || 'Anonymous'} • {formatDate(gadget.reviews[0].created_at)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="primary" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-details',{ detail: { gadget } })) }}>
            View Details
          </Button>
          
          {gadget.link && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); window.open(gadget.link!, '_blank') }}
              className="flex items-center whitespace-nowrap"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Buy
            </Button>
          )}
        </div>

        {/* Created Date */}
        <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Added {formatDate(gadget.created_at)}
        </div>
      </div>
    </div>
  )
}
