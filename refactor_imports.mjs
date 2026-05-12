import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = 'C:\\Users\\chanp\\Desktop\\Develop\\PhotoBook';
const srcDir = path.join(rootDir, 'src');

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, allFiles);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      allFiles.push(filePath);
    }
  }
  return allFiles;
}

const files = getAllFiles(srcDir);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileDir = path.dirname(filePath);

  const newContent = content.replace(/(import|export)(.*?)from\s+['"](\.\.?\/.*?)['"]/g, (match, p1, p2, p3) => {
    const absPath = path.resolve(fileDir, p3);
    if (absPath.startsWith(srcDir)) {
      let relToSrc = path.relative(srcDir, absPath).replace(/\\/g, '/');
      return `${p1}${p2}from '@/${relToSrc}'`;
    }
    return match;
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${path.relative(rootDir, filePath)}`);
  }
});
