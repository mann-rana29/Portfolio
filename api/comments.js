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
    // Fetch comments
    const { data, error } = await supabase
      .from('comments')
      .select('name, content, created_at')
      .eq('page_id', page_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Submit comment
    let { name, content } = req.body;
    
    if (!content || content.trim() === '') {
       return res.status(400).json({ error: 'Content is required' });
    }

    name = name && name.trim() !== '' ? name.trim() : 'Anonymous';

    const { data, error } = await supabase
      .from('comments')
      .insert([{ page_id, name, content }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
