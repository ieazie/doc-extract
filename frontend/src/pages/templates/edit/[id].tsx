/**
 * Edit Template Page
 * Redirects to unified template builder with template ID
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const EditTemplatePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Redirect to the unified builder with the template ID (edit mode)
      router.replace(`/templates/builder?id=${id}`);
    }
  }, [router, id]);

  return null;
};

export default EditTemplatePage;