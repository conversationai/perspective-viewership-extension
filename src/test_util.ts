export function getNormalizedInnerText(element: HTMLElement) {
  return element.innerText.replace(/\s+/g, ' ');
}

export function getIsElementVisible(element: HTMLElement): boolean {
  return element != null && element.offsetWidth > 0 && element.offsetHeight > 0
      && window.getComputedStyle(element).display !== 'none'
      && getElementOpacity(element) > 0;
}

export function getElementOpacity(element: HTMLElement): number {
  return parseFloat(
    window.getComputedStyle(element).getPropertyValue('opacity'));
}

export function sendClickEvent(item: HTMLElement): void {
  const event = document.createEvent('HTMLEvents');
  event.initEvent('click', false, true);
  item.dispatchEvent(event);
}

export function waitForTimeout(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

