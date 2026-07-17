export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  const kfRes = await fetch(
    `${process.env.KOBO_BASE_URL}/${process.env.KOBO_OWNER_USERNAME}/submission`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.KOBO_API_KEY}`,
        'X-OpenRosa-Version': '1.0',
        'Content-Type': req.headers['content-type'],
      },
      body,
    }
  )

  const text = await kfRes.text()
  res.status(kfRes.status).send(text)
}
