import mongoose from 'mongoose';

// A schema sets the rules, a model does the work (session 18).
const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    ingredients: { type: [String], required: true },
    steps: { type: [String], default: [] },
    prepTime: { type: Number, min: 0, default: 0 }, // minutes
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

// Model Recipe -> collection recipes
export const Recipe = mongoose.model('Recipe', recipeSchema);
