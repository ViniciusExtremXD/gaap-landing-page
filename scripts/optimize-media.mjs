import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = path.resolve('assets/originals');
const outputDirectory = path.resolve('public/media');
await mkdir(outputDirectory, { recursive: true });

const jobs = [
  { id: 'hero', file: 'rony-farofa.jpg', focus: '50% 75%' },
  { id: 'rony-farofa', file: 'rony-farofa.jpg', focus: '50% 75%' },
  { id: 'bella', file: 'bella.jpg', focus: '50% 65%' },
  { id: 'ravena', file: 'ravena.jpg', focus: '50% 45%' },
  { id: 'support', file: 'estelar.jpg', focus: '57% 46%' },
  { id: 'churros', file: 'churros-adocao.jpg', focus: '50% 50%', crop: { left: 0, top: 660, width: 1350, height: 1028 }, note: 'Recorte editorial da parte inferior da arte: remove chamada antiga de adoção, preserva retrato e logo GAAP. Status adotado apresentado junto da imagem.' },
];

const manifest = [];
for (const job of jobs) {
  let original = sharp(path.join(sourceDirectory, job.file)).rotate();
  if (job.crop) original = original.extract(job.crop);
  const master = await original.toBuffer();
  const dimensions = await sharp(master).metadata();
  const size = Math.min(1200, dimensions.width);
  const info = await sharp(master).resize({ width: size }).webp({ quality: 82, effort: 5 }).toFile(path.join(outputDirectory, `${job.id}.webp`));
  for (const width of [480, 800]) {
    await sharp(master).resize({ width }).webp({ quality: 80, effort: 5 }).toFile(path.join(outputDirectory, `${job.id}-${width}.webp`));
  }
  manifest.push({ id: job.id, original: `assets/originals/${job.file}`, localPath: `/media/${job.id}.webp`, width: info.width, height: info.height, bytes: info.size, focalPoint: job.focus, note: job.note || 'Redimensionamento e compressão; sem alteração de conteúdo.' });
}
await sharp(path.join(sourceDirectory, 'gaap-logo.jpg')).resize(128, 128).webp({ quality: 90 }).toFile(path.join(outputDirectory, 'logo.webp'));
await writeFile('docs/media-derivatives.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Preparadas ${manifest.length} imagens responsivas e logo.`);
console.log(JSON.stringify(manifest.map(({ id, width, height, bytes }) => ({ id, width, height, bytes })), null, 2));
