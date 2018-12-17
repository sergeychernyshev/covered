#!/usr/bin/env node

const fs = require("fs");
const url = require("url");
const path = require("path");
const colors = require("colors");

let report_filename = process.argv[2];

const coverage = fs.readFileSync(report_filename, "utf8");
const coverage_report = JSON.parse(coverage);

const dot_position = report_filename.lastIndexOf(".");

const folder_name = dot_position
  ? report_filename.substring(0, dot_position)
  : report_filename;

const covered_folder_name = folder_name + "_covered";
const original_folder_name = folder_name + "_original";

fs.mkdirSync(covered_folder_name);
fs.mkdirSync(original_folder_name);

coverage_report.forEach((asset, index) => {
  const pathname = url.parse(asset.url).pathname;

  let file_name = path.basename(pathname);
  if (!file_name) {
    file_name = `${path.basename(folder_name)}.html`;
  }

  // dedupe ranges
  const deduped_ranges = asset.ranges
    .sort((a, b) => a.start - b.start)
    .reduce((ranges, range) => {
      let overlapped = false;

      const deduped = ranges.map(existing_range => {
        let new_range = existing_range;

        if (
          (existing_range.start >= range.start &&
            existing_range.start <= range.end) ||
          (existing_range.end >= range.start && existing_range.end <= range.end)
        ) {
          new_range = {
            start: Math.min(existing_range.start, range.start),
            end: Math.max(existing_range.end, range.end)
          };

          overlapped = true;
        }

        return new_range;
      });

      // if not overlapped, add it as is to existing ranges
      if (!overlapped) {
        deduped.push(range);
      }

      return deduped;
    }, []);

  const covered = deduped_ranges
    .map(range => asset.text.substring(range.start, range.end))
    .join("");

  const covered_filename = `${covered_folder_name}/${file_name}`;
  const original_filename = `${original_folder_name}/${file_name}`;

  fs.writeFileSync(covered_filename, covered);
  fs.writeFileSync(original_filename, asset.text);

  const percentage = parseInt(covered.length * 100) / asset.text.length;

  const color =
    percentage > 100
      ? colors.bgRed
      : percentage === 100
      ? colors.green
      : percentage > 90
      ? colors.yellow
      : colors.red;

  console.log(
    asset.url,
    colors.grey("->"),
    covered_filename,
    colors.grey("@"),
    color(parseInt(percentage) + "%")
  );
});
