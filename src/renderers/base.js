/**
 * SignalGraph — Abstract Renderer Interface
 * 
 * The rendering abstraction that proves "framework-independent platform abstraction."
 * 
 * Any renderer must implement this interface. The Web Component talks
 * only to this contract — never directly to Canvas, DOM, or SVG APIs.
 * 
 * This means the rendering layer can be swapped entirely without touching
 * the component logic, the signal system, or the demo page.
 */

const RendererAPI = {
  /** Called when the component mounts or resizes */
  mount(container, width, height) {},
  
  /** Called when the component unmounts */
  unmount() {},
  
  /** Called when data or options change */
  render(data, options) {},
  
  /** Called on resize */
  resize(width, height) {},
  
  /** The element this renderer manages (for Shadow DOM placement) */
  get element() { return null; }
};

export default RendererAPI;
