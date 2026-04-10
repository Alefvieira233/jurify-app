/**
 * Generate embed code for external websites.
 * Returns a script tag that can be copied and pasted into any HTML page.
 */
export function generateEmbedCode(phoneNumber: string, officeName: string): string {
  return `<!-- Jurify WhatsApp Widget -->
<script>
(function(){
  var d=document,s=d.createElement('div');
  s.id='jurify-whatsapp-widget';
  s.innerHTML='<a href="https://wa.me/${phoneNumber.replace(/\D/g, '')}?text='+encodeURIComponent('Olá! Gostaria de saber mais sobre os serviços jurídicos de ${officeName}.')+'" target="_blank" rel="noopener" style="position:fixed;bottom:20px;right:20px;z-index:9999;width:56px;height:56px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);cursor:pointer;transition:transform 0.3s" onmouseover="this.style.transform=\\'scale(1.1)\\'" onmouseout="this.style.transform=\\'scale(1)\\'"><svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.329l4.47-1.458A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.226 0-4.29-.612-6.066-1.679l-.435-.258-2.65.865.887-2.583-.283-.449A9.79 9.79 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/></svg></a>';
  d.body.appendChild(s);
})();
</script>`;
}
