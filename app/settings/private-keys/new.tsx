import { useState } from 'react';
import { router } from 'expo-router';

import { PrivateKeyForm } from '@/components/settings/PrivateKeyForm';
import { useSensitiveRouteGuard } from '@/hooks/useSensitiveRouteGuard';
import { usePrivateKeyStore } from '@/stores';

export default function CreatePrivateKeyScreen() {
  const addKey = usePrivateKeyStore((state) => state.addKey);
  const [submitting, setSubmitting] = useState(false);

  useSensitiveRouteGuard('验证后继续新增私钥', '进入新增私钥页面前，请先完成身份验证。');

  const handleSubmit = async (values: {
    name: string;
    privateKey: string;
    passphrase?: string;
  }) => {
    try {
      setSubmitting(true);
      await addKey(values);
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PrivateKeyForm
      title="新增私钥"
      description="第一版先支持手动粘贴私钥。保存后会自动进入安全存储，并可被多台服务器复用。"
      submitLabel={submitting ? '保存中...' : '保存私钥'}
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}
