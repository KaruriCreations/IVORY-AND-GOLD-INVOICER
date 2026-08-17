const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('[Supabase] Connected successfully for cloud history storage.');
  } catch (err) {
    console.warn('[Supabase Init Error]:', err.message);
  }
}

function isSupabaseConfigured() {
  return Boolean(supabase);
}

async function saveInvoiceToSupabase({
  filename,
  clientId = 'default',
  invoiceNum = '',
  clientName = '',
  format,
  size = 0,
  invoiceData,
}) {
  if (!supabase) return null;

  const payload = {
    filename,
    client_id: clientId,
    invoice_num: invoiceNum,
    client_name: clientName,
    format,
    size,
    invoice_data: invoiceData,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('invoices')
    .upsert(payload, { onConflict: 'filename' })
    .select()
    .single();

  if (error) {
    console.warn('[Supabase Save Notice]:', error.message);
    return null;
  }
  return data;
}

async function getHistoryListFromSupabase(clientId = 'default') {
  if (!supabase) return null;

  let query = supabase
    .from('invoices')
    .select('filename, size, created_at, format, client_id')
    .order('created_at', { ascending: false });

  if (clientId && clientId !== 'all') {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[Supabase List Notice]:', error.message);
    return null;
  }

  return (data || []).map((row) => ({
    name: row.filename,
    size: row.size || 0,
    createdAt: row.created_at,
    format: row.format,
    hasMetadata: true,
    clientId: row.client_id,
  }));
}

async function getInvoiceMetadataFromSupabase(filename, clientId = 'default') {
  if (!supabase) return null;

  let query = supabase
    .from('invoices')
    .select('invoice_data')
    .eq('filename', filename);

  if (clientId && clientId !== 'all') {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) {
    return null;
  }

  return data.invoice_data;
}

async function deleteInvoiceFromSupabase(filename, clientId = 'default') {
  if (!supabase) return null;

  let query = supabase.from('invoices').delete().eq('filename', filename);
  if (clientId && clientId !== 'all') {
    query = query.eq('client_id', clientId);
  }

  const { error } = await query;
  if (error) {
    console.warn('[Supabase Delete Notice]:', error.message);
  }
}

module.exports = {
  isSupabaseConfigured,
  saveInvoiceToSupabase,
  getHistoryListFromSupabase,
  getInvoiceMetadataFromSupabase,
  deleteInvoiceFromSupabase,
};
