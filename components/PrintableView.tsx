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
              @page { size: A4 landscape; margin: 8mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .print-container { padding: 0; background: white; }
              
              /* Hide scrollbars */
              .overflow-y-auto, .overflow-x-auto { overflow: visible !important; max-height: none !important; }
              
              /* Planner Scaling */
              .planner-print-container {
                 height: 680px; /* Fixed height to prevent blank pages */
                 overflow: hidden;
              }
              .planner-print-wrapper {
                 transform: scale(0.63);
                 transform-origin: top left;
                 width: 158%; /* 100 / 0.63 */
              }
              .planner-print-wrapper button { display: none !important; }
              .planner-print-wrapper .cursor-pointer { cursor: default !important; }
              .planner-print-wrapper .hover\\:scale-\\[1\\.02\\] { transform: none !important; }
              .planner-print-wrapper .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
              
              /* Overview Printing */
              .overview-print-container {
                 /* We don't need fixed height constraint if it flows to next page or uses grid */
              }
              .overview-print-wrapper {
                 /* No more scaling, just let it use native print media queries */
                 width: 100%;
              }
            }
          `}
        </style>
        
        {/* Page 1: Planner (Details) */}
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-2 text-center">{tripData.destination} 行程細節</h1>
          <div className="planner-print-container">
            <div className="planner-print-wrapper">
              <ItineraryPlanner 
                tripData={tripData}
                itinerary={itinerary}
                onUpdateItinerary={() => {}}
                onUpdateTripData={() => {}}
                onRegenerateItem={async () => {}}
                onRegenerateDay={async () => {}}
                onAddItem={async () => {}}
                onMoveActivity={async () => {}}
                isPrintMode={true}
              />
            </div>
          </div>
        </div>

        <div className="page-break"></div>

        {/* Page 2: Overview */}
        <div className="pt-2 w-full"> {/* Minimal padding to save space */}
          <h1 className="text-3xl font-black mb-4 print:mb-2 text-center text-slate-800">{tripData.destination} 行程概覽</h1>
          <div className="overview-print-container">
            <div className="overview-print-wrapper">
              <ItineraryOverview tripData={tripData} itinerary={itinerary} />
            </div>
          </div>
        </div>
      </div>
    );
};
