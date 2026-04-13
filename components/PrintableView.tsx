import React from 'react';
import { TripData, Itinerary } from '../types';
import { ItineraryOverview } from '../views/ItineraryOverview';
import { ItineraryPlanner } from '../views/ItineraryPlanner';

interface PrintableViewProps {
  tripData: TripData;
  itinerary: Itinerary;
}

export const PrintableView: React.FC<PrintableViewProps> = ({ tripData, itinerary }) => {
    return (
      <div className="print-container bg-white text-black">
        {/* We use standard CSS to hide interactive elements during print */}
        <style>
          {`
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .print-container { padding: 0; background: white; }
              /* Hide scrollbars and ensure full height */
              .overflow-y-auto, .overflow-x-auto { overflow: visible !important; max-height: none !important; }
              /* Ensure grid layout expands */
              .grid { display: block !important; }
              .grid > div { page-break-inside: avoid; margin-bottom: 20px; }
            }
          `}
        </style>
        
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">{tripData.destination} 行程概覽</h1>
          <ItineraryOverview tripData={tripData} itinerary={itinerary} />
        </div>

        <div className="page-break"></div>

        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">{tripData.destination} 行程細節</h1>
          {/* We wrap ItineraryPlanner in a div that hides its interactive buttons via CSS */}
          <div className="planner-print-wrapper">
            <style>
              {`
                @media print {
                  .planner-print-wrapper button { display: none !important; }
                  .planner-print-wrapper .cursor-pointer { cursor: default !important; }
                  .planner-print-wrapper .hover\\:scale-\\[1\\.02\\] { transform: none !important; }
                  .planner-print-wrapper .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
                  /* Make the planner timeline expand fully */
                  .planner-print-wrapper .min-w-\\[1200px\\] { min-width: 100% !important; width: 100% !important; }
                  .planner-print-wrapper .overflow-x-auto { overflow: visible !important; }
                }
              `}
            </style>
            <ItineraryPlanner 
              tripData={tripData}
              itinerary={itinerary}
              onUpdateItinerary={() => {}}
              onUpdateTripData={() => {}}
              onRegenerateItem={async () => {}}
              onRegenerateDay={async () => {}}
              onAddItem={async () => {}}
              onMoveActivity={async () => {}}
            />
          </div>
        </div>
      </div>
    );
};
