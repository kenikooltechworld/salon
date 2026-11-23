from pathlib import Path
# Fix ServicesPage - it should also use ImageLightbox, check
p = Path('app/salon/src/pages/services/ServicesPage.tsx')
t = p.read_text(encoding='utf-8')
if 'ImageLightbox' not in t:
    # add import and state and usage
    t = t.replace('import { CategoryModal, ServiceFormDialog } from "./ServiceFormDialog";', 'import { CategoryModal, ServiceFormDialog } from "./ServiceFormDialog";\nimport { ImageLightbox } from "@/components/services/ImageLightbox";', 1)
    t = t.replace('const [delCat, setDelCatState] = useState<ServiceCategory | null>(null);', 'const [delCat, setDelCatState] = useState<ServiceCategory | null>(null);\n  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);', 1)
    t = t.replace('{service.public_image_url ? <Image src={service.public_image_url} alt={service.name} h="160px" w="full" objectFit="cover" /> : <Flex h="160px" bg="bg.muted" align="center" justify="center" color="fg.muted"><VStack gap="2"><LuImagePlus size={28} /><Text fontSize="sm">No image</Text></VStack></Flex>}',
    '{service.public_image_url ? <Image src={service.public_image_url} alt={service.name} h="160px" w="full" objectFit="cover" cursor="zoom-in" transition="opacity 0.2s" _hover={{ opacity: 0.9 }} onClick={(e) => { e.stopPropagation(); setLightbox({ url: service.public_image_url!, alt: service.name }); }} /> : <Flex h="160px" bg="bg.muted" align="center" justify="center" color="fg.muted"><VStack gap="2"><LuImagePlus size={28} /><Text fontSize="sm">No image</Text></VStack></Flex>}', 1)
    t = t.replace('    <ConfirmDialog open={!!delCat} onOpenChange={(v:boolean)=>!v && setDelCatState(null)} title="Delete Category" desc={`Delete category "${delCat?.name}"?`} onConfirm={async()=>{ if(!delCat) return; try { await delCatMut.mutateAsync(delCat.id); toaster.create({title:"Category deleted", type:"success"}); setDelCatState(null);} catch(e:any){ toaster.create({title:"Delete failed", description:e?.response?.data?.detail||e?.message, type:"error"}); } }} loading={delCatMut.isPending} />\n  </Stack>;',
    '    <ConfirmDialog open={!!delCat} onOpenChange={(v:boolean)=>!v && setDelCatState(null)} title="Delete Category" desc={`Delete category "${delCat?.name}"?`} onConfirm={async()=>{ if(!delCat) return; try { await delCatMut.mutateAsync(delCat.id); toaster.create({title:"Category deleted", type:"success"}); setDelCatState(null);} catch(e:any){ toaster.create({title:"Delete failed", description:e?.response?.data?.detail||e?.message, type:"error"}); } }} loading={delCatMut.isPending} />\n    {lightbox && <ImageLightbox isOpen={!!lightbox} imageUrl={lightbox.url} alt={lightbox.alt} onClose={() => setLightbox(null)} />}\n  </Stack>;', 1)
    p.write_text(t, encoding='utf-8')
    print('patched')
else:
    print('already has')
