from pathlib import Path
# Fix ServiceDetailPage to use ImageLightbox
p = Path('app/salon/src/pages/services/ServiceDetailPage.tsx')
t = p.read_text(encoding='utf-8')
t = t.replace('import { LuArrowLeft, LuPencil, LuTrash2, LuUsers, LuX } from "react-icons/lu";', 'import { LuArrowLeft, LuPencil, LuTrash2, LuUsers } from "react-icons/lu";')
t = t.replace('import { ServiceFormDialog } from "./ServiceFormDialog";', 'import { ServiceFormDialog } from "./ServiceFormDialog";\nimport { ImageLightbox } from "@/components/services/ImageLightbox";')
t = t.replace('IconButton, Image, Portal, Skeleton, Stack, Text, VStack', 'Image, Portal, Skeleton, Stack, Text, VStack')
old = '''    <Dialog.Root open={lightbox} onOpenChange={(e) => setLightbox(e.open)} size="cover">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content bg="blackAlpha.900"><Dialog.Body p="4"><Flex justify="end"><IconButton aria-label="Close" variant="ghost" color="white" onClick={() => setLightbox(false)}><LuX /></IconButton></Flex><Flex justify="center"><Image src={service.public_image_url || ""} alt={service.name} maxH="85vh" objectFit="contain" /></Flex></Dialog.Body></Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>'''
new = '''    {service.public_image_url && <ImageLightbox isOpen={lightbox} imageUrl={service.public_image_url} alt={service.name} onClose={() => setLightbox(false)} />}'''
if old in t:
    t = t.replace(old, new)
    p.write_text(t, encoding='utf-8')
    print('ok')
else:
    print('missing')
