import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Paperclip, File, Image, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useMessages, Message, parseAttachments, Attachment } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;

interface ChatWindowProps {
  conversationId: string;
  recipientId: string;
  recipientName?: string;
  className?: string;
}

const isImageType = (type: string | null) => type?.startsWith('image/');

const SingleAttachmentPreview = ({ 
  attachment,
  isOwn,
  getSignedUrl,
}: { 
  attachment: Attachment;
  isOwn: boolean;
  getSignedUrl: (filePath: string) => Promise<string | null>;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    if (!attachment.url) return;
    
    setIsLoadingUrl(true);
    getSignedUrl(attachment.url).then((url) => {
      setSignedUrl(url);
      setIsLoadingUrl(false);
    });
  }, [attachment.url, getSignedUrl]);

  if (isLoadingUrl) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        Failed to load attachment
      </div>
    );
  }

  if (isImageType(attachment.type)) {
    return (
      <a 
        href={signedUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        <img 
          src={signedUrl} 
          alt={attachment.name || 'Attachment'}
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-border/50"
        />
      </a>
    );
  }

  return (
    <a 
      href={signedUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-colors",
        isOwn 
          ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" 
          : "bg-background border-border hover:bg-muted"
      )}
    >
      <File className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs truncate max-w-[150px]">
        {attachment.name}
      </span>
    </a>
  );
};

const AttachmentsPreview = ({ 
  message, 
  isOwn,
  getSignedUrl,
}: { 
  message: Message; 
  isOwn: boolean;
  getSignedUrl: (filePath: string) => Promise<string | null>;
}) => {
  const attachments = parseAttachments(message);
  
  if (attachments.length === 0) return null;

  return (
    <div className={cn("mt-2 flex flex-wrap gap-2", attachments.length > 1 && "flex-col")}>
      {attachments.map((attachment, index) => (
        <SingleAttachmentPreview
          key={`${attachment.url}-${index}`}
          attachment={attachment}
          isOwn={isOwn}
          getSignedUrl={getSignedUrl}
        />
      ))}
    </div>
  );
};

export const ChatWindow = ({
  conversationId,
  recipientId,
  recipientName = 'Support Agent',
  className,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, isLoading, isUploading, uploadProgress, overallProgress, sendMessage, uploadAttachments, getSignedUrl } = useMessages(conversationId, recipientId);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than ${MAX_FILE_SIZE_MB}MB`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    // Check total file count
    const newTotal = pendingFiles.length + validFiles.length;
    if (newTotal > MAX_FILES) {
      toast({
        title: 'Too many files',
        description: `Maximum ${MAX_FILES} files allowed per message`,
        variant: 'destructive',
      });
      validFiles.splice(MAX_FILES - pendingFiles.length);
    }

    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      let attachments: Attachment[] = [];
      if (pendingFiles.length > 0) {
        attachments = await uploadAttachments(pendingFiles);
        if (attachments.length === 0) throw new Error('Failed to upload files');
      }
      await sendMessage(newMessage, attachments.length > 0 ? attachments : undefined);
      setNewMessage('');
      setPendingFiles([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Card className={cn("flex flex-col h-[500px]", className)}>
        <CardHeader className="border-b border-border py-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col h-[500px]", className)}>
      <CardHeader className="border-b border-border py-4 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <span>Chat with {recipientName}</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Start a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Send a message or attach evidence documents. Your agent will respond as soon as possible.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={cn(
                      "text-xs",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {isOwn ? 'You' : recipientName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {message.content && !message.content.startsWith('📎') && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    <AttachmentsPreview message={message} isOwn={isOwn} getSignedUrl={getSignedUrl} />
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <CardContent className="border-t border-border p-4 flex-shrink-0 space-y-3">
        {/* Upload progress */}
        {isUploading && uploadProgress.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Uploading {uploadProgress.filter(p => p.status === 'complete').length}/{uploadProgress.length} files...
              </span>
              <span className="text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {uploadProgress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    p.status === 'complete' ? "bg-emerald-500" :
                    p.status === 'error' ? "bg-destructive" :
                    p.status === 'uploading' ? "bg-primary animate-pulse" :
                    "bg-muted-foreground"
                  )} />
                  <span className="truncate flex-1 text-muted-foreground">{p.file.name}</span>
                  <span className="text-muted-foreground">{p.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending files preview */}
        {pendingFiles.length > 0 && !isUploading && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {pendingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                {file.type.startsWith('image/') ? (
                  <Image className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <File className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => removePendingFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} selected
              {pendingFiles.length < MAX_FILES && ` (max ${MAX_FILES})`}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
            multiple
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading || pendingFiles.length >= MAX_FILES}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && pendingFiles.length === 0) || isSending || isUploading}
            size="icon"
          >
            {isSending || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
