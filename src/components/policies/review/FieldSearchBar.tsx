'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionValidationInfo } from '@/lib/services/reviewService';

interface FieldSearchBarProps {
  sections: SectionValidationInfo[];
  onSearchResults: (results: SearchResults) => void;
}

export interface SearchResults {
  query: string;
  matchingSections: string[]; // section names that have matches
  matchCount: number;
}

// Field label mappings for search
const fieldLabels: Record<string, string> = {
  fullName: 'Nombre completo',
  companyName: 'Razón social',
  rfc: 'RFC',
  curp: 'CURP',
  nationality: 'Nacionalidad',
  passport: 'Pasaporte',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  personalEmail: 'Correo personal',
  workEmail: 'Correo laboral',
  workPhone: 'Teléfono laboral',
  companyRfc: 'RFC empresa',
  occupation: 'Ocupación',
  employerName: 'Empleador',
  monthlyIncome: 'Ingreso mensual',
  bankName: 'Banco',
  accountNumber: 'Número de cuenta',
  clabe: 'CLABE',
  accountHolder: 'Titular de cuenta',
  street: 'Calle',
  exteriorNumber: 'Número exterior',
  interiorNumber: 'Número interior',
  neighborhood: 'Colonia',
  municipality: 'Municipio',
  state: 'Estado',
  postalCode: 'Código postal',
  country: 'País',
  legalRepName: 'Representante legal',
  legalRepPosition: 'Cargo',
  legalRepRfc: 'RFC representante',
  legalRepPhone: 'Teléfono representante',
  legalRepEmail: 'Correo representante',
  personalReferences: 'Referencias personales',
  commercialReferences: 'Referencias comerciales',
  name: 'Nombre',
  relationship: 'Relación',
  contactName: 'Nombre de contacto',
};

function searchInValue(value: any, query: string): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.toLowerCase().includes(query);
  }

  if (typeof value === 'number') {
    return value.toString().includes(query);
  }

  if (Array.isArray(value)) {
    return value.some(item => searchInValue(item, query));
  }

  if (typeof value === 'object') {
    return Object.values(value).some(v => searchInValue(v, query));
  }

  return false;
}

function countMatches(fields: any, query: string): number {
  if (!fields || !query) return 0;

  let count = 0;

  const searchFields = (obj: any) => {
    if (!obj) return;

    for (const [key, value] of Object.entries(obj)) {
      // Check if key label matches
      const label = fieldLabels[key] || key;
      if (label.toLowerCase().includes(query)) {
        count++;
      }

      // Check if value matches
      if (searchInValue(value, query)) {
        count++;
      }

      // Recurse into arrays and objects
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object') {
            searchFields(item);
          }
        });
      }
    }
  };

  searchFields(fields);
  return count;
}

export default function FieldSearchBar({
  sections,
  onSearchResults,
}: FieldSearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Calculate search results
  const searchResults = useMemo((): SearchResults => {
    if (!debouncedQuery) {
      return { query: '', matchingSections: [], matchCount: 0 };
    }

    const matchingSections: string[] = [];
    let totalMatches = 0;

    for (const section of sections) {
      // Search in field labels
      let sectionHasMatch = false;

      if (section.fields) {
        for (const [key, value] of Object.entries(section.fields)) {
          const label = fieldLabels[key] || key;

          // Check label match
          if (label.toLowerCase().includes(debouncedQuery)) {
            sectionHasMatch = true;
            totalMatches++;
          }

          // Check value match
          if (searchInValue(value, debouncedQuery)) {
            sectionHasMatch = true;
            totalMatches++;
          }
        }
      }

      // Also search in section display name
      if (section.displayName.toLowerCase().includes(debouncedQuery)) {
        sectionHasMatch = true;
        totalMatches++;
      }

      if (sectionHasMatch) {
        matchingSections.push(section.section);
      }
    }

    return {
      query: debouncedQuery,
      matchingSections,
      matchCount: totalMatches,
    };
  }, [sections, debouncedQuery]);

  // Notify parent of search results
  useEffect(() => {
    onSearchResults(searchResults);
  }, [searchResults, onSearchResults]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar campos... (ej: RFC, CURP, ingreso)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-20"
        />
        {query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchResults.matchCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {searchResults.matchCount} coincidencia{searchResults.matchCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {query && searchResults.matchCount === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          No se encontraron resultados para "{query}"
        </p>
      )}
    </div>
  );
}

// Helper to highlight matching text
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200 px-0.5 rounded">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
