import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  const { page_id } = req.query;

  if (!page_id) {
    return res.status(400).json({ error: 'page_id is required' });
  }

  if (req.method === 'GET') {
    // Fetch like count
    const { data, error } = await supabase
      .from('likes')
      .select('count')
      .eq('page_id', page_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means zero rows returned (which is fine, it means 0 likes)
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ count: data ? data.count : 0 });
  }

  if (req.method === 'POST') {
    const action = req.query.action || 'like'; // default to like

    // 1. Check if row exists
    const { data: existingData } = await supabase
      .from('likes')
      .select('count')
      .eq('page_id', page_id)
      .single();

    if (existingData) {
      // Increment or decrement
      let newCount = existingData.count;
      if (action === 'like') {
        newCount += 1;
      } else if (action === 'unlike') {
        newCount = Math.max(0, newCount - 1);
      }

      const { data, error } = await supabase
        .from('likes')
        .update({ count: newCount })
        .eq('page_id', page_id)
        .select()
        .single();
      
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ count: data.count });
    } else {
      // Create new row (if unliking a non-existent row, it's just 0)
      const initialCount = action === 'like' ? 1 : 0;
      const { data, error } = await supabase
        .from('likes')
        .insert([{ page_id: page_id, count: initialCount }])
        .select()
        .single();
        
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ count: data.count });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
