import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint to generate image or PDF
app.post('/generate', async (req: Request, res: Response) => {
  const { url, format = 'image' } = req.body;

  // Validate input
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL is required' });
  }
  if (!['image', 'pdf'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format. Use "image" or "pdf"' });
  }

  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Railway
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    });
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    if (format === 'pdf') {
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });
      await browser.close();

      // Send PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
      return res.send(pdfBuffer);
    } else {
      // Generate screenshot (default)
      const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: true });
      await browser.close();

      // Send image response
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename=screenshot.png');
      return res.send(screenshotBuffer);
    }
  } catch (error) {
    console.error('Error generating output:', error);
    await browser?.close();
    return res.status(500).json({ error: 'Failed to generate output' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});