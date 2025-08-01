# AWS Lambda Java Executor
FROM public.ecr.aws/lambda/provided:al2

# Install Java
RUN yum update -y && \
    yum install -y java-11-amazon-corretto java-11-amazon-corretto-devel && \
    yum clean all

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-11-amazon-corretto.x86_64

# Install Python for Lambda runtime interface
RUN yum install -y python3 pip && \
    pip3 install awslambdaric

# Copy Lambda function code
COPY lambda-handlers/java-handler.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "java-handler.lambda_handler" ]
