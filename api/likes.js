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
    // Basic IP-based rate limiting or just incrementing
    // In a real scenario we'd use IP to prevent spam, but for now we just increment

    // 1. Check if row exists
    const { data: existingData } = await supabase
      .from('likes')
      .select('count')
      .eq('page_id', page_id)
      .single();

    if (existingData) {
      // Increment
      const { data, error } = await supabase
        .from('likes')
        .update({ count: existingData.count + 1 })
        .eq('page_id', page_id)
        .select()
        .single();
      
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ count: data.count });
    } else {
      // Create new row
      const { data, error } = await supabase
        .from('likes')
        .insert([{ page_id: page_id, count: 1 }])
        .select()
        .single();
        
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ count: data.count });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
