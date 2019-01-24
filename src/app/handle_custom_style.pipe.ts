import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

const VALID_CUSTOM_CSS_VARS = ['--background-color'];

/**
 * Pipe that takes a custom CSS style string, validates that it constains one of
 * the custom CSS variables that we expect, and returns a SafeStyle. Otherwise,
 * just returns the original value (so we only bypass the sanitizer for values
 * we know that we trust).
 *
 * Usage:
 *   value | handleCustomStyle
 */
@Pipe({name: 'handleCustomStyle'})
export class HandleCustomStylePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): string|SafeStyle {
    for (const cssVar of VALID_CUSTOM_CSS_VARS) {
      if (value.match(cssVar)) {
        return this.sanitizer.bypassSecurityTrustStyle(value);
      }
    }
    console.log('Attempted to bind unsecure CSS style value', value);
    return value;
  }
}
