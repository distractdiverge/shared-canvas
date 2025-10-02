'use client';

import { useState } from 'react';
import { COLOR_PALETTE, MAX_NAME_LENGTH } from '@/lib/constants';

interface NameEntryModalProps {
  onSubmit: (name: string, color: string) => void;
}

export default function NameEntryModal({ onSubmit }: NameEntryModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0 && name.length <= MAX_NAME_LENGTH) {
      onSubmit(name.trim(), selectedColor);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Welcome to Shared Canvas</h2>
        <p className="text-gray-600 mb-6">Enter your name and choose a color to start drawing</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name ({name.length}/{MAX_NAME_LENGTH})
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              autoFocus
              maxLength={MAX_NAME_LENGTH}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Your Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-4 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Start Drawing
          </button>
        </form>
      </div>
    </div>
  );
}
