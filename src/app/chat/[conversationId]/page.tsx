import ChatPageClient from "./ChatPageClient";

export default async function ChatPage({
  params,
}: {
  params: Promise<{
    conversationId: string;
  }>;
}) {
  const { conversationId } = await params;

  return (
    <ChatPageClient
      conversationId={conversationId}
    />
  );
}