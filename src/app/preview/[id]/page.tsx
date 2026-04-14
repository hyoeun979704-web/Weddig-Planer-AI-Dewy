export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <p className="text-xl text-foreground">Preview Page - Coming Soon</p>
      <p className="mt-2 text-muted-foreground">ID: {params.id}</p>
    </main>
  )
}
