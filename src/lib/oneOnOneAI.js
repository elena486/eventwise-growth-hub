import { base44 } from '@/api/base44Client';

/**
 * Process a 1:1 meeting note through the backend function, which calls the
 * Anthropic API (claude-sonnet-4-6) directly, parses the JSON response, saves
 * the AI summary + pending tasks, and sets status to "Processed".
 *
 * Throws an Error with a human-readable message on failure.
 */
export async function processNoteWithAI(noteId, rawNotes, teamMember, meetingDate) {
  try {
    const response = await base44.functions.invoke('processOneOnOneNote', {
      noteId,
      rawNotes,
      teamMember,
      meetingDate,
    });
    return response.data;
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'AI processing failed';
    throw new Error(msg);
  }
}