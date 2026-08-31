import { Router } from 'express';
import { store } from './store';

const EVENTS_LATENCY_MS = 300;
export const rest = Router();


rest.get('/products', (req, rest) => {
    setTimeout(async () => {
    res.json(await store.products());
  }, EVENTS_LATENCY_MS);
} )

rest.get('/products/:id', async (req, res) => {
  const product = await store.event(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(product);
});
